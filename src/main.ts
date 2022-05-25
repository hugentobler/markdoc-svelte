import MarkdocSource from "@markdoc/markdoc";
import yaml from "js-yaml";
import render from "./render";

interface Options {
  extensions?: string[];
  layout?: string;
  schema?: string;
}

interface PreprocessorReturn {
  code: string;
  data?: Record<string, unknown>;
  map?: string;
}

interface Preprocessor {
  markup: (args: {
    content: string;
    filename: string;
  }) => PreprocessorReturn | undefined;
}

/**
 * A Svelte preprocessor for Markdoc files
 *
 * options – An object with the following optional properties:
 *
 * - `layout` - The path to a layout for your Markdoc files
 * - `schemaPath` - The path to your custom schema for Markdoc tags, nodes, and so on
 *
 */
export const markdoc = (options: Options = {}): Preprocessor => {
  const layoutPath = options.layout;
  const extensions = options.extensions || [".md"];

  return {
    markup: ({ content = "", filename = "" }) => {
      if (!extensions.find(extension => filename.endsWith(extension))) return;

      const ast = MarkdocSource.parse(content);

      const isFrontmatter = Boolean(ast.attributes.frontmatter);

      const frontmatter = isFrontmatter
        ? (yaml.load(ast.attributes.frontmatter) as Record<string, unknown>)
        : {};

      const transformedContent = MarkdocSource.transform(ast, {
        variables: { frontmatter },
      });

      const svelteContent = render(transformedContent);
      const frontmatterString = isFrontmatter
        ? `<script context="module">\n` +
          `\texport const metadata = ${JSON.stringify(frontmatter)};\n` +
          `\tconst { ${Object.keys(frontmatter as Record<string, unknown>).join(
            ", "
          )} } = metadata;\n` +
          "</script>\n"
        : "";

      const layoutOpenString = layoutPath
        ? "<script>\n" +
          `\timport Layout_MDSVEX_DEFAULT from '${layoutPath}';\n` +
          "</script>\n" +
          `<Layout_MDSVEX_DEFAULT${isFrontmatter ? ` {...metadata}` : ""}>\n`
        : "";

      const layoutCloseString = layoutPath ? "</Layout_MDSVEX_DEFAULT>\n" : "";

      const code =
        frontmatterString +
        layoutOpenString +
        svelteContent +
        layoutCloseString;

      return {
        code: code,
        data: frontmatter,
      };
    },
  };
};
