import type { Config, Schema } from "@markdoc/markdoc";

/**
 * Generates Svelte import statements for components found in a Markdoc schema.
 *
 * @param schema - The Markdoc configuration object containing tags and nodes.
 * @param componentDirPath - The directory path where Svelte components are located.
 *                           This can be any path format that Svelte/SvelteKit supports:
 *                           - Framework alias (e.g., "$lib/components")
 *                           - Absolute path (e.g., "/src/components")
 *                           - Relative path (e.g., "./components")
 * @returns A string containing all generated Svelte import statements.
 */
export const getComponentImports = (
  schema: Config,
  componentDirPath: string,
): string => {
  let importStatements = "";

  const addImportsForSchemaItems = (
    schemaItems: Config["tags"] | Config["nodes"] | undefined,
  ) => {
    if (!schemaItems) return;

    const itemsRecord = schemaItems as Record<
      string,
      Schema | string | undefined
    >;

    for (const name in itemsRecord) {
      const item = itemsRecord[name];
      if (!item || typeof item === "string") continue;

      const renderName = (item as { render?: unknown }).render;
      if (typeof renderName === "string" && /^\p{Lu}/u.test(renderName)) {
        // Create component path using the provided directory path
        // We'll use POSIX style paths (forward slashes) for consistency
        const componentPath =
          `${componentDirPath}/${renderName}.svelte`.replace(/\/\//g, "/");

        // Generate the import statement
        importStatements += `\timport ${renderName} from '${componentPath}';\n`;
      }
    }
  };

  addImportsForSchemaItems(schema.tags);
  addImportsForSchemaItems(schema.nodes);

  return importStatements;
};
