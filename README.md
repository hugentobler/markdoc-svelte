# markdoc-svelte

Preprocess [Markdoc](https://markdoc.io/) files for use in Svelte Kit sites.

## Use

To preprocess Markdown files with Markdoc, add ".md" or ".mdoc" to your Svelte Kit configuration extensions. And import the `markdoc-svelte` as a preprocessor.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".mdoc", ".md"],
  preprocess: [markdoc()],
};
```

## Customize Markdoc schema

The main way to use Markdoc is defining schemas that it parses to augment your Markdown. USING CONFIG OBJECTS.

Markdoc allows you to configure various options for parsing:

- [Functions](https://markdoc.dev/docs/functions)
- [Nodes](https://markdoc.dev/docs/nodes)
- [Partials](https://markdoc.dev/docs/partials)
- [Tags](https://markdoc.dev/docs/tags)
- [Variables](https://markdoc.dev/docs/variables)

To include these options in your preprocessing, pass them in the configuration.
You can do this in two ways:

- Pass each individually as an option.
- Create a schema directory to include files that define each option for you.
  Include that directory in the [markdown-svelte configuration](#schema-path).

In each case, imports happen before bundling, so import files as relative paths to JavaScript files with the extension.
Use JavaScript files or run Node.js with a tool such as [tsx](https://tsx.is/) to use TypeScript.

### Functions

Use Markdoc [functions](https://markdoc.dev/docs/functions) to transform content.
Include them as a file or directory in your [Markdoc schema directory](#schema-path)
or in the markdoc-svelte configuration.

```javascript
import { markdoc } from "markdoc-svelte";

const uppercase = {
  transform(parameters) {
    const string = parameters[0];

    return typeof string === "string" ? string.toUpperCase() : string;
  },
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      functions: { uppercase },
    }),
  ],
};
```

### Nodes

Use Markdoc [nodes](https://markdoc.dev/docs/nodes) to customize how standard Markdown elements are rendered.
Include them as a file or directory in your [Markdoc schema directory](#schema-path)
or in the markdoc-svelte configuration.

Imports happen before bundling, so import files as relative paths to JavaScript files with the extension.

```javascript
import { markdoc } from "markdoc-svelte";
import { link } from "./markdown/link.js";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      nodes: { link },
    }),
  ],
};
```

### Partials

Use Markdoc [partials](https://markdoc.dev/docs/partials) to reuse blocks of content in various places.
Include them in a directory in your [Markdoc schema directory](#schema-path)
or define a partials directory as a relative path in the markdoc-svelte configuration.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      partials: "./markdoc/partials",
    }),
  ],
};
```

### Tags

Use Markdoc [tags](https://markdoc.dev/docs/tags) to extend Markdown elements to do more.
Include them as a file or directory in your [Markdoc schema directory](#schema-path)
or in the markdoc-svelte configuration.

Imports happen before bundling, so import files as relative paths to JavaScript files with the extension.

```javascript
import { markdoc } from "markdoc-svelte";
import { button } from "./markdown/button.js";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      nodes: { button },
    }),
  ],
};
```

### Variables

Use Markdoc [variables](https://markdoc.dev/docs/variables) to customize content during the build.
Include them as a file in your [Markdoc schema directory](#schema-path)
or in the markdoc-svelte configuration.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      variables: { flags: { best_feature_flag: true } },
    }),
  ],
};
```

## Code blocks

Markdoc tags are processed as the first thing.
This allows you to do things like use Markdoc variables inside code blocks.
But sometimes you want to include text like `{% %}` inside a code block.

To mark a single code block to not be processed for tags,
add a attribute to the block:

````markdown
```markdown {% process = false %}
Use variables in your code: `{% product_name %}`
```
````

To set this as the default option, create a custom `fence` node and set a different default
([example](https://github.com/markdoc/markdoc/issues/503#issuecomment-2079771178)).

## Frontmatter

Frontmatter added as YAML is automatically parsed.
So you could add frontmatter like the following:

```markdown
---
title: A great page
---

With great content
```

You can then access it in your layouts:

```svelte
<script lang="ts">
  let {
    children,
    title = '',
  } = $props()
</script>

<h1>{ title }</h1>

<!-- Article content -->
{@render children?.()}
```

And in your content:

```markdown
---
title: Using the Next.js plugin
description: Integrate Markdoc into your Next.js app
---

# {% $frontmatter.title %}
```

## Options

You can choose to customize how Markdoc files are processed.

| Option            | Type             | Default                           | Description                                     |
| ----------------- | ---------------- | --------------------------------- | ----------------------------------------------- |
| `extensions`      | string[]         | `[".mdoc", ".md"]`               | [File extensions to preprocess](#extensions)                  |
| `schema`          | string           | `["./markdoc", "./src/markdoc"]` | [Markdoc schema directory](#schema)                     |
| `nodes`           | object           |                                  | [Markdoc nodes](#nodes)                        |
| `tags`            | object           |                                  | [Markdoc tags](#tags)                          |
| `variables`       | object           |                                  | [Markdoc variables](#variables)                |
| `functions`       | object           |                                  | [Markdoc functions](#functions)                |
| `partials`        | string           |                                  | [Markdoc partials directory](#partials)                |
| `components`      | string           | `"$lib/components"`              | [Svelte components directory](#components)            |
| `layout`          | string           |                                  | [Svelte layout component](#layout)                    |
| `comments`        | boolean          | `true`                           | [Allow Markdown comments](#comments)                   |
| `linkify`         | boolean          | `false`                          | [Auto-convert URLs to links](#linkify)         |
| `typographer`     | boolean          | `false`                          | [Typography replacements](#typographer)        | 
| `validationLevel` | string           | `"error"`                        | [Validation level of preprocessor](#validation-level)          |

### Extensions

By default files ending in `.mdoc` and `.md` are preprocessed. Remember to include all Markdoc extensions in the Svelte Kit config `extensions` array.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".mdoc", ".md"],
  preprocess: [
    markdoc({
      extensions: [".mdoc", ".md"],
    }),
  ],
};
```

### Schema

By default, the preprocessor looks for your Markdoc schema definition in `./markdoc` or `./src/markdoc` directories. 

You can define each schema part as a single file or a directory with an index.ts or index.js file that exports it. Except for partials, which is a directory holding Markdoc files.

Example structure:

```
| markdoc/
|-- nodes.ts
|-- tags/
|   |-- marquee.ts
|   |-- decorate.ts
|   |-- index.ts
|-- functions.ts
|-- variables.ts
|-- partials/
|   |-- content.mdoc
|   |-- post.mdoc
```

You can specify a custom directory path relative to the Svelte project root. 

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      schema: "./path/to/schema/directory",
    }),
  ],
};
```

### Nodes

Import an object of nodes to use as Markdoc Nodes. These customize how standard Markdown elements are rendered. Overwrites nodes with the same name from 'schema' directory.

```javascript
import { markdoc } from "markdoc-svelte";
import { link } from "./markdoc/nodes/link.js";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      nodes: { link },
    }),
  ],
};
```

### Tags

Import an object of tags to use as Markdoc Tags. These extend Markdown elements to do more. Overwrites tags with the same name from 'schema' directory.

```javascript
import { markdoc } from "markdoc-svelte";
import { button } from "./markdoc/tags/button.js";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      tags: { button },
    }),
  ],
};
```

### Variables

Import an object of variables to use as Markdoc Variables. These customize content during the build. Overwrites variables with the same name from 'schema' directory.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      variables: { 
        flags: { best_feature_flag: true },
        site_name: "My Site"
      },
    }),
  ],
};
```

### Functions

Import an object of functions to use as Markdoc Functions. These transform content during rendering. Overwrites functions with the same name from 'schema' directory.

```javascript
import { markdoc } from "markdoc-svelte";

const uppercase = {
  transform(parameters) {
    const string = parameters[0];
    return typeof string === "string" ? string.toUpperCase() : string;
  },
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      functions: { uppercase },
    }),
  ],
};
```

### Partials

Specify a directory to import files with 'extensions' as Markdoc Partials. Default is to load partials from 'schema' directory. Overwrites partials with the same name from 'schema' directory.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      partials: "./markdoc/partials",
    }),
  ],
};
```

### Components

Specify a directory to import Svelte components to customize Markdoc Nodes and Tags. Use import paths and aliases that Svelte can resolve.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      components: "$lib/markdoc/components",
    }),
  ],
};
```

### Layout

Specify a Svelte component to use as a layout for the Markdoc file. Use import paths and aliases that Svelte can resolve. [Frontmatter](#frontmatter) in YAML format is automatically passed to your layout as props.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      layout: "$lib/layouts/MarkdocLayout.svelte",
    }),
  ],
};
```

### Comments

Enable adding Markdown comments to your documents. Whether to allow [Markdown comment syntax](https://spec.commonmark.org/0.30/#example-624) to hide comments from the rendered output.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      comments: false,
    }),
  ],
};
```

### Linkify

Enable autoconvert URL-like text to links. When enabled, URLs in your content will automatically become clickable links.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      linkify: true,
    }),
  ],
};
```

### Typographer

Enable some language-neutral replacement + quotes beautification. Choose whether to turn on typographic replacements from [markdown-it](https://github.com/markdown-it/markdown-it).

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      typographer: true,
    }),
  ],
};
```

### Validation Level

Sets the level invalid parsing will throw a preprocess error. This preprocessor validates whether the Markdoc is valid. By default, it throws an error on files for errors at the `error` or `critical` level. Possible values in ascending order: `debug`, `info`, `warning`, `error`, `critical`.

```javascript
import { markdoc } from "markdoc-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    markdoc({
      validationLevel: "warning",
    }),
  ],
};
```
