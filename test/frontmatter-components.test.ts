import { markdoc } from "../src/main.ts";
import { noFrontmatter, withFrontmatter, noComponents, multipleComponents } from "./constants.ts";
import { describe, it, expect } from "vitest";
import { customComponent } from "./markdoc/tags/custom-component";
import { anotherComponent } from "./markdoc/tags/another-component";

describe("Frontmatter and Component Generation", () => {
  const testOptions = {
    schemaDirectory: "./test/markdoc",
    componentsDirectory: "./test/components"
  };

  it("No frontmatter", async () => {
    expect(
      await markdoc(testOptions).markup!({ content: noFrontmatter, filename: "test.md" })
    ).toMatchSnapshot();
  });

  it("With frontmatter", async () => {
    expect(
      await markdoc(testOptions).markup!({ content: withFrontmatter, filename: "test.md" })
    ).toMatchSnapshot();
  });

  it("No components", async () => {
    expect(
      await markdoc(testOptions).markup!({ content: noComponents, filename: "test.md" })
    ).toMatchSnapshot();
  });

  it("Multiple components with props", async () => {
    expect(
      await markdoc(testOptions).markup!({ content: multipleComponents, filename: "test.md" })
    ).toMatchSnapshot();
  });
}); 