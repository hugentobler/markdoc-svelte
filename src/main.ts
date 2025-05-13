import Markdoc from "@markdoc/markdoc";
import type { Config, ParserArgs } from "@markdoc/markdoc";
import type { PreprocessorGroup } from "svelte/compiler";
import YAML from "yaml";

import { getComponentImports } from "./components.ts";
import { handleValidationErrors } from "./errors.ts";
import { findFirstDirectory, makePathProjectRelative } from "./files.ts";
import log from "./logs.ts";
import loadPartials from "./partials.ts";
import render from "./render.ts";
import loadSchemas from "./schema.ts";
import type { Options } from "./types";

const validOptionKeys: (keyof Options)[] = [
  "extensions",
  "allowComments",
  "linkify",
  "typographer",
  "validationLevel",
  "schemaDirectory",
  "partialsDirectory",
  "componentsDirectory",
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
  const allowComments = options.allowComments ?? true;
  const typographer = options.typographer ?? false;
  const linkify = options.linkify ?? false;
  const schemaPaths = options.schemaDirectory
    ? [makePathProjectRelative(options.schemaDirectory)]
    : ["./markdoc", "./src/markdoc"];
  const partialsPath = options.partialsDirectory
    ? makePathProjectRelative(options.partialsDirectory)
    : undefined;
  const componentsPath = options.componentsDirectory || "$lib/components";

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
      // Markdown-It options https://github.com/markdown-it/markdown-it?tab=readme-ov-file#init-with-presets-and-options
      const markdownItConfig = {
        linkify,
        typographer,
      };
      const tokenizer = new Markdoc.Tokenizer({
        allowIndentation: true,
        allowComments: allowComments,
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

      // --- Parse Frontmatter ---
      const isFrontmatter = Boolean(ast.attributes.frontmatter);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const frontmatter: Record<string, unknown> = isFrontmatter
        ? YAML.parse(ast.attributes.frontmatter as string)
        : {};

      // --- Prepare to load Schemas & Partials ---
      const dependencies: string[] = [];
      let configFromSchema: Config = {};
      let partialsFromSchema: Config["partials"] = {};
      let partialsFromPartials: Config["partials"] = {};

      // --- Discover optional schema directory ---
      const schemaDir = findFirstDirectory(schemaPaths);

      // --- Load Schemas and Partials from resolved schema directory ---
      if (schemaDir) {
        const { config, deps: schemaDeps } = await loadSchemas(schemaDir);
        configFromSchema = config;
        dependencies.push(...schemaDeps);

        const { config: partials, deps } = loadPartials(schemaDir, extensions);
        if (partials) partialsFromSchema = partials;
        dependencies.push(...deps);
      }

      // --- Load Partials from specified partials directory ---
      if (partialsPath) {
        const { config, deps } = loadPartials(partialsPath, extensions, true);
        if (config) partialsFromPartials = config;
        dependencies.push(...deps);
      }

      // --- Assemble full config ---
      const fullConfig: Config = {
        // Start with base config loaded from the schema directory
        nodes: { ...configFromSchema.nodes },
        tags: { ...configFromSchema.tags },
        functions: { ...configFromSchema.functions },
        // Make $frontmatter available as variable
        variables: { ...configFromSchema.variables, frontmatter },
        // Merge partials: explicitly set partials overwrrite auto-loaded ones
        partials: { ...partialsFromSchema, ...partialsFromPartials },
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

      // --- Validate Markdoc AST ---
      const errors = Markdoc.validate(ast, fullConfig);
      handleValidationErrors(errors, validationLevel, filename);

      // --- Tranform AST with loaded config ---
      const transformedContent = Markdoc.transform(ast, fullConfig);

      // --- Render Markdoc AST to Svelte ---
      const svelteContent = render(transformedContent);

      // --- Define frontmatter string for Svelte ---
      // Declare module context, destructure frontmatter object
      const scriptModuleTag = isFrontmatter
        ? `<script module>\n` +
          `\texport const frontmatter = ${JSON.stringify(frontmatter)};\n` +
          `\tconst { ${Object.keys(frontmatter).join(", ")} } = frontmatter;\n` +
          `</script>\n`
        : ``;

      // --- Generate component import statements ---
      const componentsString = getComponentImports(fullConfig, componentsPath);

      const scriptTag = `<script>\n` + `${componentsString}` + `</script>\n`;

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
        scriptModuleTag +
        scriptTag +
        // layoutOpenString +
        svelteContent;
      // layoutCloseString;

      console.log(code);
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
