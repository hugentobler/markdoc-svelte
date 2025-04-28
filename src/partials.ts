import FS from "fs";
import Path from "path";

import type { Config } from "@markdoc/markdoc";
import Markdoc from "@markdoc/markdoc";

import log from "./logs.ts";

interface LoadedPartialsResult {
  config: Config["partials"] | null;
  dependencies: string[]; // Preprocessor markup dependencies
}

/**
 * Loads Markdoc partials from a specified directory.
 *
 * @param partialsDirectory The absolute, normalized path to the directory containing partial files.
 *                          If null, returns an empty result.
 * @param extensions An array of file extensions (e.g., ['.mdoc', '.md']) to consider as partials.
 * @param isExplicitPath A boolean indicating if `partialsDirectory` was provided directly by the user
 *                       (true) or inferred (e.g., from schema path) (false). Used for logging.
 * @returns A `LoadedPartialsResult` object containing the loaded partials config and dependencies.
 */
const loadPartials = (
  partialsDirectory: string,
  extensions: string[],
  isExplicitPath: boolean,
): LoadedPartialsResult => {
  const partialsDependencies: string[] = [];
  let partialsConfig: Config["partials"] | null = null;
  let partialsLoaded = false; // Track if any partials were successfully loaded

  const directory = isExplicitPath
    ? partialsDirectory
    : Path.resolve(partialsDirectory, "partials");

  // Check if the directory exists
  if (!FS.existsSync(directory)) {
    if (isExplicitPath) {
      // Only warn if the user *explicitly* provided a path that doesn't exist.
      // If it was inferred (e.g., './markdoc/partials'), non-existence is acceptable.
      log.warn(
        `Specified "partialsDirectory" option value '${partialsDirectory}' not found.`,
      );
    } else {
      log.debug(
        `Inferred partials directory '${directory}' not found, skipping partials load.`,
      );
    }
    return { config: null, dependencies: [] };
  }

  // Directory exists, try loading files
  try {
    const files = FS.readdirSync(directory);

    for (const file of files) {
      const filePath = Path.posix.join(directory, file); // Use posix.join
      const fileExtension = Path.extname(file);

      // Check if it's a file and has a valid extension
      try {
        const stats = FS.statSync(filePath);
        if (!stats.isFile() || !extensions.includes(fileExtension)) {
          continue; // Skip directories or files with wrong extensions
        }
      } catch (e) {
        log.error(`Could not read stats for '${filePath}', skipping.`, e);
        continue;
      }

      // Read and parse valid Markdoc files as partials
      try {
        const content = FS.readFileSync(filePath, "utf8");
        const ast = Markdoc.parse(content); // Consider adding file path to parse args if needed for errors

        if (!partialsConfig) {
          partialsConfig = {};
        }
        const partialName = Path.basename(file, fileExtension);
        partialsConfig[file] = ast;
        partialsDependencies.push(filePath); // Already absolute and normalized
        partialsLoaded = true;
        log.debug(`Loaded partial '${partialName}' from '${filePath}'`);
      } catch (e) {
        log.error(`Error parsing partial file '${filePath}':`, e);
        // Continue trying other files
      }
    }
  } catch (e) {
    log.error(`Error reading partials directory '${directory}':`, e);
    // Return whatever might have been loaded before the error
    return {
      config: partialsConfig,
      dependencies: [...new Set(partialsDependencies)],
    };
  }

  // After attempting to load, check if any partials were actually loaded
  if (!partialsLoaded && FS.existsSync(directory)) {
    // The directory exists, but nothing was loaded from it.
    const message = `Partials directory '${directory}' exists, but no valid partial files (${extensions.join(", ")}) were found or loaded. Check file extensions and content for errors.`;
    // Warn slightly differently depending on how the path was determined
    if (isExplicitPath) {
      log.warn(message);
    } else {
      log.info(message + " This may be intentional."); // Less severe if inferred
    }
  }

  log.debug(`Partials Dependencies: ${partialsDependencies.toString()}`);
  log.debug(`Partials Config: ${JSON.stringify(partialsConfig)}`);

  return {
    config: partialsConfig,
    dependencies: [...new Set(partialsDependencies)], // Ensure uniqueness
  };
};

export default loadPartials;
