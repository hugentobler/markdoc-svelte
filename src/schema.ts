import FS from "fs";
import Path from "path";

import type { Config } from "@markdoc/markdoc";

import log from "./logs.ts";

// Describes the structure of the configuration loaded by this function
interface LoadedConfig {
  tags?: Config["tags"];
  // nodes?: Record<string, Node | string>;
  // functions?: Record<string, FunctionDefinition>;
  // variables?: Record<string, any>;
  // partials?: string; // If you load the partials path here
}

// Describes the overall return value of loadSchema
interface LoadedSchemaResult {
  config: LoadedConfig;
  dependencies: string[]; // Preprocessor markup dependencies
  resolvedSchemaPath: string | null; // The actual directory path that was found and used
}

// Helper to normalize path separators to POSIX style (forward slashes)
const normalizeAbsolutePath = (absolutePath: string): string => {
  return absolutePath.split(Path.sep).join(Path.posix.sep);
};

/**
 * Asynchronously searches specified paths for a Markdoc schema directory and loads
 * configuration components (like tags, functions, variables) from predefined files
 * (e.g., 'tags.ts', 'functions/index.js') within that directory.
 *
 * It checks paths in the provided order and uses the first valid directory found.
 * It dynamically imports modules from files like `tags.ts`, `tags.js`,
 * `tags/index.ts`, or `tags/index.js` (and similarly for `functions`, `nodes`, etc.).
 * Cache-busting is added to imports in development mode to aid HMR.
 *
 * @async
 * @param schemaPaths An array of potential relative paths to the schema directory.
 *                    The function will search these paths in order.
 * @returns A Promise resolving to a `LoadedSchemaResult` object containing:
 *          - `config`: The assembled Markdoc configuration (`LoadedConfig`).
 *          - `dependencies`: An array of absolute file paths the configuration depends on,
 *                           useful for file watchers and HMR.
 *          - `resolvedSchemaPath`: The relative path from `schemaPaths` that was found,
 *                                 or `null` if none were found.
 */
const loadSchemas = async (
  schemaPaths: string[],
): Promise<LoadedSchemaResult> => {
  let resolvedSchemaPath: string | null = null;
  let schemaDirectory: string | null = null;
  const schemaDependencies: string[] = [];
  const loadedConfigParts: Partial<LoadedConfig> = {};

  // Discover the first directory from schemaPaths that exists
  for (const relativePath of schemaPaths) {
    const potentialPath = Path.posix.resolve(relativePath);
    if (FS.existsSync(potentialPath)) {
      schemaDirectory = potentialPath;
      resolvedSchemaPath = relativePath;
      break; // Use the first one found
    }
  }

  // Return early if no valid directory found
  if (!schemaDirectory) {
    log.warn(
      `No schemas imported as no valid schema directory found. Tried: ${schemaPaths.join(", ")}`,
    );
    return { config: {}, dependencies: [], resolvedSchemaPath: null };
  }

  // --- Directory Found - Proceed with loading ---

  // Helper to resolve paths within the found schema directory
  const getNormalizedPathInSchemaDirectory = (subDirectory: string) =>
    normalizeAbsolutePath(Path.posix.resolve(schemaDirectory, subDirectory));

  /**
   * Reads the default export from JS/TS files in a specific subdirectory
   * within the resolved schema directory (e.g., 'tags', 'functions').
   * Handles finding .ts, .js, index.ts, index.js files.
   * Used internally by `loadSchemas`.
   *
   * @param directoryName The name of the subdirectory (e.g., "tags").
   * @returns A Promise resolving to the default export object if found, otherwise null.
   *          The specific type depends on the overload used by the caller.
   */
  // --- Define readDirectory Overloads (Public Signatures) ---
  async function readDirectory(
    directoryName: "nodes",
  ): Promise<Config["nodes"] | null>;
  async function readDirectory(
    directoryName: "tags",
  ): Promise<Config["tags"] | null>;

  // --- Implementation Signature ---
  // This signature must be compatible with all overloads. Using 'unknown' is
  // type-safe but may trigger specific lint rules like 'no-redundant-type-constituents'
  // because the overloads provide narrower types. We disable it only for this line.
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  async function readDirectory(directoryName: string): Promise<unknown | null> {
    if (!schemaDirectory) return null;

    try {
      const moduleBase = getNormalizedPathInSchemaDirectory(directoryName);
      let moduleFile: string | null = null;

      // Support loading .ts and .js schemas
      // Check both the base file and the index file
      // for example: tags.ts and tags/index.ts
      const pathsToCheck = [
        `${moduleBase}.ts`,
        `${moduleBase}.js`,
        `${moduleBase}/index.ts`,
        `${moduleBase}/index.js`,
      ];

      for (const potentialPath of pathsToCheck) {
        if (FS.existsSync(potentialPath)) {
          moduleFile = potentialPath;
          break;
        }
      }

      if (moduleFile) {
        let importPath = `file://${moduleFile}`;
        // --- CONDITIONAL Cache Busting ---
        // To overcome default caching of dynamic imports in Vite
        // So that schema changes are HMR'd in development mode
        if (process.env.NODE_ENV === "development") {
          importPath += `?t=${Date.now()}`;
        }
        // ---------------------------------

        // Dynamically import module and save the file path as a dependency
        const importedModule = (await import(importPath)) as {
          default?: unknown;
        };
        schemaDependencies.push(moduleFile);

        // Return the default export
        return importedModule?.default || null;
      }
      // No file found for this directory name
      return null;
    } catch (error) {
      log.error(`Error when loading schema from '${directoryName}':`, error);
      return null;
    }
  }

  // --- Load Specific Schema Parts ---
  const [tags /*, nodes, functions */] = await Promise.all([
    readDirectory("tags"),
    // readDirectory("nodes"),
    // readDirectory("functions"),
  ]);

  // Assign to the config, checking for null
  if (tags) {
    loadedConfigParts.tags = tags; // Type-safe assignment
  }
  // if (functions) {
  //     loadedConfigParts.functions = functions; // Type-safe assignment
  // }
  // TODO: Add checks for nodes, functions etc. here if loaded

  // --- Final Assembly ---
  const finalConfig: LoadedConfig = {
    tags: loadedConfigParts.tags,
    // nodes: loadedConfigParts.nodes, // etc.
  };

  return {
    config: finalConfig,
    dependencies: [...new Set(schemaDependencies)],
    resolvedSchemaPath: resolvedSchemaPath,
  };
};

export default loadSchemas;
