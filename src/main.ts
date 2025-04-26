import Markdoc from "@markdoc/markdoc";
import type { Config, ParserArgs } from "@markdoc/markdoc";
import MarkdownIt from "markdown-it";
import type { PreprocessorGroup } from "svelte/compiler";
import YAML from "yaml";

import { handleValidationErrors } from "./error.ts";
import { getComponentImports } from "./getComponents.ts";
import getPartials from "./getPartials.ts";
import loadSchema from "./loader.ts";
import render from "./render.ts";
import type { ValidationLevel } from "./types";

/**
 * Configuration options for the Markdoc preprocessor
 * @interface Options
 */
interface Options {
  /** File extentions to preprocess (default: [".mdoc", ".md"]) */
  extensions?: string[];
  /** Enable markdown parser comments (default: false) */
  comments?: boolean;
  /** Enable markdown parser to autoconvert URL-like text to links (default: false) */
  linkify?: boolean;
  /** Enable markdown parser language-neutral replacement + quotes beautification (default: false) */
  typographer?: boolean;
  /** Sets the validation level the preprocessor will throw an error and stop the build (default: "error") */
  validationLevel?: ValidationLevel;
  layout?: string;
  schema?: string;
  functions?: Config["functions"];
  nodes?: Config["nodes"];
  partials?: string;
  tags?: Config["tags"];
  variables?: Config["variables"];
}

/**
 * Creates a Svelte preprocessor for Markdoc files
 * @param {Options} options - Configuration options for the Markdoc preprocessor
 * @returns {PreprocessorGroup} A Svelte preprocessor for Markdoc files
 */
export const markdoc = (options: Options = {}): PreprocessorGroup => {
  const extensions = options.extensions || [".mdoc", ".md"];
  const comments = options.comments || false;
  const typographer = options.typographer || false;
  const linkify = options.linkify || false;

  const layoutPath = options.layout;
  const schemaPath = options.schema;

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
      /**
       * Only preprocess files that end with options.extensions
       */
      if (
        !filename ||
        !extensions.find((extension) => filename.endsWith(extension))
      )
        return;
      /**
       * Create config for token parser
       * Then create and configure the Markdoc tokenizer
       */
      const markdownItConfig: MarkdownIt.Options = {
        linkify,
        typographer,
      };
      const tokenizer = new Markdoc.Tokenizer({
        allowIndentation: true,
        allowComments: comments,
        ...markdownItConfig,
      });
      /**
       * Create config for Markdoc parser
       * Then parse tokens to AST
       */
      const parserConfig: ParserArgs = {
        file: filename, // Debugging
        location: true, // Debugging
        slots: false, // TODO: Add support for slots?
      };
      const ast = Markdoc.parse(tokenizer.tokenize(content), parserConfig);
      /**
       * Parse frontmatter if present
       */
      const isFrontmatter = Boolean(ast.attributes.frontmatter);
      const frontmatter = isFrontmatter
        ? (YAML.parse(ast.attributes.frontmatter) as Record<string, unknown>)
        : {};

      const schemaFromPath = await loadSchema(schemaPath);

      const {
        partials: partialsDirectoryFromSchema,
        variables: variablesFromSchema,
        ...schemaFromPathWithoutPartials
      } = schemaFromPath;

      // Include schema parts passed as options
      // But ignore if undefined
      // Leave out partials until directory processed
      const schemaWithoutPartials = {
        ...schemaFromPathWithoutPartials,
        ...(functions && { functions }),
        ...(nodes && { nodes }),
        ...(tags && { tags }),
      };

      const markdocConfig = {
        ...schemaWithoutPartials,
        variables: { frontmatter, ...(variables || variablesFromSchema) },
        partials:
          partialsDirectory || schemaFromPath["partials"]
            ? getPartials(partialsDirectory || schemaFromPath["partials"])
            : undefined,
      };

      /**
       * Check if Markdoc AST is valid
       * Separate errors into breaking and non-breaking and log them appropriately
       */
      const errors = Markdoc.validate(ast, markdocConfig);
      handleValidationErrors(errors, validationLevel, filename);

      const transformedContent = await Markdoc.transform(ast, markdocConfig);

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
        schemaWithoutPartials,
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
      };
    },
  };
};
