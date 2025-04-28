import Markdoc from "@markdoc/markdoc";
import type { Config, ParserArgs } from "@markdoc/markdoc";
import MarkdownIt from "markdown-it";
import type { PreprocessorGroup } from "svelte/compiler";
import YAML from "yaml";

import { handleValidationErrors } from "./errors.ts";
import { findFirstExistingDirectory } from "./files.ts";
import { getComponentImports } from "./getComponents.ts";
import log from "./logs.ts";
import loadPartials from "./partials.ts";
import render from "./render.ts";
import loadSchemas from "./schema.ts";
import type { Options } from "./types";

const validOptionKeys: (keyof Options)[] = [
  "extensions",
  "comments",
  "linkify",
  "typographer",
  "validationLevel",
  "schemaDirectory",
  "partialsDirectory",
];

/**
 * Creates a Svelte preprocessor for Markdoc files
 * @param {Options} options - Configuration options for the Markdoc preprocessor
 * @returns {PreprocessorGroup} A Svelte preprocessor for Markdoc files
 */
export const markdoc = (options: Options = {}): PreprocessorGroup => {
  // Warn about invalid options
  for (const key in options) {
    if (!validOptionKeys.includes(key as keyof Options)) {
      log.warn(
        `Invalid option "${key}" provided and ignored.  Please check the documentation for valid options.`,
      );
    }
  }

  const extensions =
    options.extensions && options.extensions.length > 0
      ? options.extensions
      : [".mdoc", ".md"];
  const comments = options.comments ?? false;
  const typographer = options.typographer ?? false;
  const linkify = options.linkify ?? false;
  const schemaPaths = options.schemaDirectory
    ? [options.schemaDirectory]
    : ["./markdoc", "./src/markdoc"];
  const partialsPath = options.partialsDirectory;

  const layoutPath = options.layout;

  const validationLevel = options.validationLevel || "error";
  const {
    functions,
    nodes,
    partials: partialsDirectory,
    tags,
    variables,
  } = options;

  return {
    name: "markdoc-svelte",
    markup: async ({ content, filename }) => {
      // --- Check if file is a Markdoc file ---
      if (
        !filename ||
        !extensions.find((extension) => filename.endsWith(extension))
      )
        return;

      // --- Tokenization ---
      const markdownItConfig: MarkdownIt.Options = {
        linkify,
        typographer,
      };
      const tokenizer = new Markdoc.Tokenizer({
        allowIndentation: true,
        allowComments: comments,
        ...markdownItConfig,
      });
      const tokens = tokenizer.tokenize(content);

      // --- Parse to AST ---
      const parserConfig: ParserArgs = {
        file: filename, // Debugging
        location: true, // Debugging
        slots: false, // TODO: Add support for slots?
      };
      const ast = Markdoc.parse(tokens, parserConfig);

      // --- Frontmatter ---
      const isFrontmatter = Boolean(ast.attributes.frontmatter);
      const frontmatter = isFrontmatter
        ? (YAML.parse(ast.attributes.frontmatter) as Record<string, unknown>)
        : {};

      // --- Load Schemas & Partials
      const dependencies: string[] = [];
      let configFromSchemaDir: Config = {};
      let partialsFromSchemaDir: Config["partials"] = {};
      let partialsFromExplicitDir: Config["partials"] = {};

      // Discover optional schema directory
      const resolvedSchemaDir = findFirstExistingDirectory(schemaPaths);

      // Load Schemas and Partials from the resolved directory
      if (resolvedSchemaDir) {
        const { config: loadedSchemaConfig, dependencies: schemaDeps } =
          await loadSchemas(resolvedSchemaDir);
        configFromSchemaDir = loadedSchemaConfig;
        dependencies.push(...schemaDeps);

        const { config: loadedPartialsConfig, dependencies: partialDeps } =
          loadPartials(resolvedSchemaDir, extensions, false);
        if (loadedPartialsConfig) partialsFromSchemaDir = loadedPartialsConfig;
        dependencies.push(...partialDeps);
      }

      // Load Partials from the specified directory if provided
      if (partialsPath) {
        const { config: loadedPartialsConfig, dependencies: partialDeps } =
          loadPartials(partialsPath, extensions, true);
        if (loadedPartialsConfig)
          partialsFromExplicitDir = loadedPartialsConfig;
        dependencies.push(...partialDeps);
      }

      // --- Assemble the final config ---
      const finalConfig: Config = {
        // Start with base config loaded from the schema directory
        nodes: { ...configFromSchemaDir.nodes },
        tags: { ...configFromSchemaDir.tags },
        functions: { ...configFromSchemaDir.functions },
        variables: { ...configFromSchemaDir.variables },

        // Merge partials: explicit path takes precedence over schema dir path
        partials: {
          ...partialsFromSchemaDir,
          ...partialsFromExplicitDir, // Explicitly loaded partials override those from schema dir if names clash
        },
      };

      // const {
      //   partials: partialsDirectoryFromSchema,
      //   variables: variablesFromSchema,
      //   ...schemaFromPathWithoutPartials
      // } = schemaFromPath;

      // Include schema parts passed as options
      // But ignore if undefined
      // Leave out partials until directory processed
      // const schemaWithoutPartials = {
      //   ...schemaFromPathWithoutPartials,
      //   ...(functions && { functions }),
      //   ...(nodes && { nodes }),
      //   ...(tags && { tags }),
      // };

      // const markdocConfig = {
      //   ...schemaWithoutPartials,
      //   variables: { frontmatter, ...(variables || variablesFromSchema) },
      //   partials:
      //     partialsDirectory || schemaFromPath["partials"]
      //       ? getPartials(partialsDirectory || schemaFromPath["partials"])
      //       : undefined,
      // };

      /**
       * Check if Markdoc AST is valid
       * Separate errors into breaking and non-breaking and log them appropriately
       */
      const errors = Markdoc.validate(ast, finalConfig);
      handleValidationErrors(errors, validationLevel, filename);

      const transformedContent = Markdoc.transform(ast, finalConfig);

      const svelteContent = render(transformedContent);
      const frontmatterString = isFrontmatter
        ? `<script context="module">\n` +
          `\texport const metadata = ${JSON.stringify(frontmatter)};\n` +
          `\tconst { ${Object.keys(frontmatter).join(", ")} } = metadata;\n` +
          "</script>\n"
        : "";

      // TODO
      // - getComponentImports looks through the imported TAGS and gathers all the needed Svelte components. Following a rigid path, and namving convention.
      // - I want to introduce another option that can render the components also for Nodes with a custom attribute set to say "tag: <component-name>". Doing so would involve including a "Render" option to the config. which probably means I need to either add a Render string, or somehow move the schema from Node to Tag?
      // - I MAY NOT NEED TO USE TAGS AFTER ALL. Nodes can be set render strings too. In that case, maybe I can access the name of the component I want from an attribute, then pass it to Render. Then let the getcomponents function handle the rest by modifying it to look at Tags too.

      const componentsString = getComponentImports(
        // schemaWithoutPartials,
        finalConfig,
        "/src/lib/components",
      );
      const layoutOpenString =
        layoutPath || componentsString
          ? `
          <script>
            ${layoutPath ? `import Layout_DEFAULT from '${layoutPath}';` : ""}
            ${componentsString}
          </script>
          ${
            layoutPath
              ? `<Layout_DEFAULT${isFrontmatter ? ` {...metadata}` : ""}>\n`
              : ""
          }`
          : "";

      const layoutCloseString = layoutPath ? "</Layout_DEFAULT>\n" : "";

      const code =
        frontmatterString +
        layoutOpenString +
        svelteContent +
        layoutCloseString;

      // TODO: data is not a valid return value for processorgroup
      // We already embed frontmatter as metadata in code
      return {
        code: code,
        // data: frontmatter,
        dependencies,
      };
    },
  };
};
