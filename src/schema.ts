import FS from "fs";
import Path from "path";

import type { Config } from "@markdoc/markdoc";

import log from "./logs.ts";

/**
 * Describe a loaded Markdoc config with optional parts.
 */
interface LoadedConfig {
  nodes?: Config["nodes"];
  tags?: Config["tags"];
  variables?: Config["variables"];
  functions?: Config["functions"];
}

/**
 * Asynchronously loads Markdoc Nodes, Tags, Variables, and Functions
 * from Schema folders and files (e.g., 'tags.ts', 'functions/index.js')
 * from a specified directory.
 *
 * Supports importing from files like `nodes.ts`, `nodes.js`, `nodes/index.ts`
 * or `nodes/index.js` (and similarly for `tags`, `variables`, `functions`).
 *
 * Cache-busting added in development mode for HMR.
 *
 * @param directory - The absolute, normalized path to the schema directory.
 * @returns A Promise resolving to an object with two properties:
 * - config: The loaded and assembled Markdoc config with optional parts.
 * - deps: An array of absolute file paths as dependencies for Svelte preprocessor.
 */
const loadSchemas = async (
  directory: string,
): Promise<{
  config: LoadedConfig;
  deps: string[];
}> => {
  const loadedConfigParts: Partial<LoadedConfig> = {};
  const deps: string[] = [];
  const dir = directory;

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
      const moduleBase = Path.posix.join(dir, configPartName);
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
          importPath += `?t=${Date.now()}`; // Cache-busting for HMR
        }

        const importedModule = (await import(importPath)) as {
          default?: unknown;
        };
        deps.push(moduleFile); // Add the *actual file found* as a dependency

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

  // log.debug(`Schema Dependencies: ${deps.toString()}`);
  // log.debug(
  //   `Loaded Schema Config: ${JSON.stringify(finalConfig)}`,
  // );

  return {
    config: finalConfig,
    deps: [...new Set(deps)], // Ensure uniqueness
  };
};

export default loadSchemas;
