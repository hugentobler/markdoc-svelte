import MarkdownIt from "markdown-it";

const md = MarkdownIt();
const escapeHtml = (str: string) => md.utils.escapeHtml(str);

// Regular expressions to test and replace Markdoc brackets.
const BRACKET_ESCAPE_TEST_RE = /[{}]/;
const BRACKET_ESCAPE_REPLACE_RE = /[{}]/g;

// Mapping for replacing curly braces with their HTML escaped counterparts.
const BRACKET_REPLACEMENTS: Record<string, string> = {
  "{": "&lcub;",
  "}": "&rcub;",
};

// Replacement function used in String.replace. It returns
// the mapped replacement if the character is a curly brace.
const replaceMarkdocBrackets = (character: string): string => {
  return BRACKET_REPLACEMENTS[character] ?? character;
};

/**
 * Escapes curly brackets in the string so that they are not interpreted
 * as Markdoc-specific syntax. Optionally, it applies HTML escaping for other content.
 */
export const escapeMarkdocBrackets = (
  str: string,
  includeOtherHtml = true,
): string => {
  if (BRACKET_ESCAPE_TEST_RE.test(str)) {
    return str.replace(BRACKET_ESCAPE_REPLACE_RE, replaceMarkdocBrackets);
  }
  return includeOtherHtml ? escapeHtml(str) : str;
};

// Regular expressions for unescaping previously escaped Markdoc brackets.
const BRACKET_UNESCAPE_TEST_RE = /(&lcub;|&rcub;)/;
const BRACKET_UNESCAPE_REPLACE_RE = /(&lcub;|&rcub;)/g;

/**
 * Replacement function that maps an escaped bracket back to its original character.
 */
const replaceEscapedBracket = (escapedBracket: string): string => {
  return (
    Object.keys(BRACKET_REPLACEMENTS).find(
      (key) => BRACKET_REPLACEMENTS[key] === escapedBracket,
    ) || ""
  );
};

/**
 * Reverses the escaping of Markdoc brackets and returns the original string.
 */
export const unescapeMarkdocBrackets = (str: string): string => {
  if (BRACKET_UNESCAPE_TEST_RE.test(str)) {
    return str.replace(BRACKET_UNESCAPE_REPLACE_RE, replaceEscapedBracket);
  }
  return str;
};
