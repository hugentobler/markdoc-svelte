import type { Config } from "@markdoc/markdoc";

/**
 * The validation levels for the preprocessor.
 */
export type ValidationLevel =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "critical";

/**
 * Configuration options for the Markdoc preprocessor
 */
export interface Options {
  /**
   * File extensions to preprocess.
   * @default [".mdoc", ".md"]
   */
  extensions?: string[];
  /**
   * Enable adding Markdown comments to your documents.
   * @default true
   */
  allowComments?: boolean;
  /**
   * Enable autoconvert URL-like text to links.
   * @default false
   */
  linkify?: boolean;
  /**
   * Enable some language-neutral replacement + quotes beautification.
   * @default false
   */
  typographer?: boolean;
  /**
   * Sets the level invalid parsing will throw a preprocess error.
   * @default "error"
   */
  validationLevel?: ValidationLevel;
  /**
   * Specify a relative directory path to import folders or files to use as Markdoc Schemas.
   * @default ["./markdoc", "./src/markdoc"]
   */
  schemaDirectory?: string;
  /**
   * Specify a relative directory path to import files (with extensions) to use as Markdoc Partials.
   * @default undefined
   */
  partialsDirectory?: string;

  layout?: string;
  functions?: Config["functions"];
  nodes?: Config["nodes"];
  tags?: Config["tags"];
  variables?: Config["variables"];
}
