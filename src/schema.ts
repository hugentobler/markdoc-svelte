import FS from "fs";
import Path from "path";

import type { Config } from "@markdoc/markdoc";

import log from "./logs.ts";

// Describes the structure of the configuration loaded by this function
interface LoadedConfig {
  nodes?: Config["nodes"];
  tags?: Config["tags"];
  variables?: Config["variables"];
  functions?: Config["functions"];
}

// Describes the overall return value of loadSchema
interface LoadedSchemaResult {
  config: LoadedConfig;
  dependencies: string[]; // Preprocessor markup dependencies
}

/**
 * Asynchronously loads Markdoc configuration components (tags, functions, variables, nodes)
 * from predefined files (e.g., 'tags.ts', 'functions/index.js') within a given directory.
 *
 * It dynamically imports modules from files like `tags.ts`, `tags.js`,
 * `tags/index.ts`, or `tags/index.js` (and similarly for `functions`, `nodes`, etc.).
 * Cache-busting is added to imports in development mode to aid HMR.
 *
 * @async
 * @param schemaDirectory The absolute, normalized path to the schema directory. If null, returns empty config.
 * @returns A Promise resolving to a `LoadedSchemaResult` object containing:
 *          - `config`: The assembled Markdoc configuration (`LoadedConfig`).
 *          - `dependencies`: An array of absolute file paths the configuration depends on.
 */
const loadSchemas = async (
  schemaDirectory: string,
): Promise<LoadedSchemaResult> => {
  const schemaDependencies: string[] = [];
  const loadedConfigParts: Partial<LoadedConfig> = {};

  // Helper to resolve paths within the found schema directory
  // Expects schemaDirectory to be absolute and normalized already
  const getPathInSchemaDirectory = (subPath: string) =>
    Path.posix.join(schemaDirectory, subPath); // Use posix.join for consistency

  /**
   * Reads the default export from JS/TS files for a specific config part
   * within the resolved schema directory (e.g., 'tags', 'functions').
   * Handles finding .ts, .js, index.ts, index.js files.
   * Used internally by `loadSchemas`.
   *
   * @param configPartName The name of the config part (e.g., "tags").
   * @returns A Promise resolving to the default export object if found, otherwise null.
   */
  // --- Define readDirectory Overloads (Public Signatures) ---
  async function readConfigPart(
    configPartName: "nodes",
  ): Promise<Config["nodes"] | null>;
  async function readConfigPart(
    configPartName: "tags",
  ): Promise<Config["tags"] | null>;
  async function readConfigPart(
    configPartName: "variables",
  ): Promise<Config["variables"] | null>;
  async function readConfigPart(
    configPartName: "functions",
  ): Promise<Config["functions"] | null>;

  // --- Implementation Signature ---
  async function readConfigPart(
    configPartName: string,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  ): Promise<unknown | null> {
    try {
      const moduleBase = getPathInSchemaDirectory(configPartName);
      let moduleFile: string | null = null;

      const pathsToCheck = [
        `${moduleBase}.ts`,
        `${moduleBase}.js`,
        `${moduleBase}/index.ts`,
        `${moduleBase}/index.js`,
      ];

      for (const potentialPath of pathsToCheck) {
        // Use FS.existsSync with the potential path directly
        if (FS.existsSync(potentialPath)) {
          moduleFile = potentialPath; // Already absolute and normalized
          if (moduleFile.includes("/index.")) {
            log.info(
              `Remember to include .ts file extension when importing ${configPartName} into ${moduleFile}`,
            );
          }
          break;
        }
      }

      if (moduleFile) {
        let importPath = `file://${moduleFile}`;
        if (process.env.NODE_ENV === "development") {
          importPath += `?t=${Date.now()}`;
        }

        const importedModule = (await import(importPath)) as {
          default?: unknown;
        };
        // Add the *actual file found* as a dependency
        schemaDependencies.push(moduleFile);

        return importedModule?.default || null;
      }
      return null;
    } catch (error) {
      log.error(`Error loading schema part '${configPartName}':`, error);
      return null;
    }
  }

  // --- Load Specific Schema Parts ---
  const [nodes, tags, variables, functions] = await Promise.all([
    readConfigPart("nodes"),
    readConfigPart("tags"),
    readConfigPart("variables"),
    readConfigPart("functions"),
  ]);

  // Type-safe assignment, checking for null
  if (nodes) loadedConfigParts.nodes = nodes;
  if (tags) loadedConfigParts.tags = tags;
  if (variables) loadedConfigParts.variables = variables;
  if (functions) loadedConfigParts.functions = functions;

  // --- Final Assembly ---
  const finalConfig: LoadedConfig = {
    nodes: loadedConfigParts.nodes,
    tags: loadedConfigParts.tags,
    variables: loadedConfigParts.variables,
    functions: loadedConfigParts.functions,
  };

  log.debug(`Schema Dependencies: ${schemaDependencies.toString()}`);
  log.debug(
    `Loaded Schema Config (excluding partials): ${JSON.stringify(finalConfig)}`,
  );

  return {
    config: finalConfig,
    dependencies: [...new Set(schemaDependencies)], // Ensure uniqueness
  };
};

export default loadSchemas;
