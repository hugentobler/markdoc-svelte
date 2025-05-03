import type {
  RenderableTreeNode,
  RenderableTreeNodes,
  Scalar,
} from "@markdoc/markdoc";
import MarkdownIt from "markdown-it";

import { escapeMarkdocBrackets } from "./utils.ts";

const md = MarkdownIt();
const escapeHtml = (str: string) => md.utils.escapeHtml(str);

// Elements with no closing tag
// https://html.spec.whatwg.org/#void-elements
const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

/**
 * Escapes children content for code and pre blocks.
 * If content is a string, escapes Markdoc brackets.
 * If it is an array, converts each child to a string, removes all newlines,
 * applies Markdoc bracket escaping, and joins them.
 * For other types, returns an empty string.
 */
const escapeChildrenToString = (
  content: string | RenderableTreeNode[] | { [key: string]: Scalar },
): string => {
  // --- DEBUG ---
  console.log(
    `[escapeChildrenToString] Received content. Type: ${typeof content}, isArray: ${Array.isArray(
      content,
    )}`,
  );
  // Optional: Log the actual content, but be wary of large inputs
  // try { console.log('[escapeChildrenToString] Content value:', JSON.stringify(content)); } catch { console.log('[escapeChildrenToString] Content value (raw):', content); }
  // --- /DEBUG ---

  if (typeof content === "string") {
    // --- DEBUG ---
    console.log("[escapeChildrenToString] Processing as string.");
    // console.log('[escapeChildrenToString] String input:', content); // Log input string
    // --- /DEBUG ---
    const result = escapeMarkdocBrackets(content);
    // --- DEBUG ---
    console.log(
      "[escapeChildrenToString] String output (after escape):",
      result,
    ); // Log output
    // --- /DEBUG ---
    return result;
  }
  if (Array.isArray(content)) {
    // --- DEBUG ---
    console.log("[escapeChildrenToString] Processing as array.");
    // --- /DEBUG ---
    const processedChildren = content.map((child, index) => {
      const childString = child?.toString() || "";
      // --- DEBUG ---
      // console.log(`[escapeChildrenToString] Array item ${index} (stringified):`, childString);
      // --- /DEBUG ---
      const noNewlines = childString.replace(/\n/g, "");
      // --- DEBUG ---
      // console.log(`[escapeChildrenToString] Array item ${index} (no newlines):`, noNewlines);
      // --- /DEBUG ---
      const escaped = escapeMarkdocBrackets(noNewlines);
      // --- DEBUG ---
      console.log(
        `[escapeChildrenToString] Array item ${index} (escaped):`,
        escaped,
      );
      // --- /DEBUG ---
      return escaped;
    });
    const result = processedChildren.join("\n");
    // --- DEBUG ---
    console.log("[escapeChildrenToString] Array output (joined):", result);
    // --- /DEBUG ---
    return result;
  }
  // --- DEBUG ---
  console.log(
    '[escapeChildrenToString] Processing as other type. Returning "".',
  );
  // --- /DEBUG ---
  return "";
};

/**
 * Renders a Markdoc node into an HTML string.
 */
const render = (node: RenderableTreeNodes): string => {
  // Early return for strings.
  if (typeof node === "string") {
    // --- DEBUG ---
    // console.log('[render] Processing string node:', node);
    // --- /DEBUG ---
    return node;
  }

  // If node is an array, join together the rendered contents.
  if (Array.isArray(node)) {
    // --- DEBUG ---
    // console.log('[render] Processing array node:', node);
    // --- /DEBUG ---
    return node.map(render).join("");
  }

  // Fallback for null or non-objects.
  if (node === null || typeof node !== "object") {
    // --- DEBUG ---
    console.log("[render] Processing null or non-object node:", node);
    // --- /DEBUG ---
    return "";
  }

  // Destructure properties.
  const { name, attributes, children = [] } = node;

  // --- DEBUG ---
  // Log details for potentially problematic tags like pre/code
  if (name === "pre" || name === "code") {
    console.log(
      `[render] Processing node: name=${name}, attributes=${JSON.stringify(
        attributes,
      )}`,
    );
    console.log(
      `[render] Children type: ${typeof children}, isArray: ${Array.isArray(
        children,
      )}`,
    );
    // Optional: Log children structure carefully
    // try { console.log('[render] Children value:', JSON.stringify(children)); } catch { console.log('[render] Children value (raw):', children); }
  }
  // --- /DEBUG ---

  // If there’s no tag name, directly render the children.
  if (!name) {
    // --- DEBUG ---
    // console.log('[render] Node has no name, rendering children:', children);
    // --- /DEBUG ---
    return render(children);
  }

  // Ensure the tag name is a string.
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const tagName = String(name);
  // Process tag attributes and escape their values.
  const attributesList = Object.entries(attributes ?? {}).reduce(
    (acc, [key, value]) => acc + ` ${key}="${escapeHtml(String(value))}"`,
    "",
  );
  const openingTag = `<${tagName}${attributesList}`;

  // For void elements (self‑closing).
  if (voidElements.has(tagName)) {
    return `${openingTag} />`;
  }

  // If children is a number or boolean, produce an empty content element.
  if (typeof children === "number" || typeof children === "boolean") {
    return `${openingTag}></${tagName}>`;
  }

  // Process children.
  if (children && (Array.isArray(children) ? children.length : true)) {
    // Special handling for code and pre elements.
    if (tagName === "code") {
      // --- DEBUG ---
      console.log(
        `[render] Handling <code> tag. Passing children to escapeChildrenToString.`,
      );
      // --- /DEBUG ---
      const escapedContent = escapeChildrenToString(children);
      // --- DEBUG ---
      console.log(
        `[render] Result from escapeChildrenToString for <code>:`,
        escapedContent,
      );
      // --- /DEBUG ---
      return `${openingTag}>${escapedContent}</${tagName}>`;
    }
    if (tagName === "pre") {
      // --- DEBUG ---
      console.log(
        `[render] Handling <pre> tag. Passing children to escapeChildrenToString.`,
      );
      // --- /DEBUG ---
      const escapedContent = escapeChildrenToString(children);
      // --- DEBUG ---
      console.log(
        `[render] Result from escapeChildrenToString for <pre>:`,
        escapedContent,
      );
      // --- /DEBUG ---
      return `${openingTag}><code>${escapedContent}</code></${tagName}>`;
    }
    // Otherwise, recursively render children.
    return `${openingTag}>${render(children)}</${tagName}>`;
  }

  // Fallback: no children provided.
  return `${openingTag}></${tagName}>`;
};

export default render;
