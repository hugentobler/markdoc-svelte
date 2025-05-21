import type { Config } from "@markdoc/markdoc";
import type { Component } from "svelte";

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
   * Specify a directory to import folders or files to use as Markdoc Schemas.
   * Path is relative to Svelte project root.
   * @default ["./markdoc", "./src/markdoc"]
   */
  schemaDirectory?: string;
  /**
   * Specify a directory to import files with 'extensions' as Markdoc Partials.
   * Default is to load partials from 'schemaDirectory'.
   * Path is relative to Svelte project root.
   * @default undefined
   */
  partialsDirectory?: string;
  /**
   * Specify a directory to import Svelte components to customize Markdoc Nodes and Tags.
   * Use import paths and aliases that Svelte can resolve.
   * @default "$lib/components"
   */
  componentsDirectory?: string;
  /**
   * Specify a Svelte component to use as a layout for the Markdoc file.
   * Use import paths and aliases that Svelte can resolve.
   * @default undefined
   */
  layout?: string;
  
  functions?: Config["functions"];
  nodes?: Config["nodes"];
  tags?: Config["tags"];
  variables?: Config["variables"];
}

/**
 * Represents the structure of an imported Markdoc module.
 */
export interface MarkdocModule {
  /**
   * The default Svelte component exported by the Markdoc file.
   */
  default: Component;
  /**
   * Optional frontmatter extracted from the Markdoc file.
   */
  frontmatter?: { [key: string]: string };
}
