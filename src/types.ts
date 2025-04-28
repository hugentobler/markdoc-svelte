import type { Config } from "@markdoc/markdoc";

export type ValidationLevel =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "critical";

/**
 * Configuration options for the Markdoc preprocessor
 * @interface Options
 */
export interface Options {
  /** File extensions to preprocess (default: [".mdoc", ".md"]) */
  extensions?: string[];
  /** Enable markdown parser comments (default: false) */
  comments?: boolean;
  /** Enable markdown parser to autoconvert URL-like text to links (default: false) */
  linkify?: boolean;
  /** Enable markdown parser language-neutral replacement + quotes beautification (default: false) */
  typographer?: boolean;
  /** Sets the validation level the preprocessor will throw an error and stop the build (default: "error") */
  validationLevel?: ValidationLevel;
  /** Customize the Markdoc Schemas directory path (relative path to Svelte config) */
  schemaDirectory?: string;
  /** Specify a directory to import files (with .extensions) to use as Markdoc Partials (relative path to Svelte config) */
  partialsDirectory?: string;

  layout?: string;
  functions?: Config["functions"];
  nodes?: Config["nodes"];
  tags?: Config["tags"];
  variables?: Config["variables"];
}
