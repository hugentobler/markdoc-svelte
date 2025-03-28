import { markdoc } from "../src/main";
import { markdocWithFunction } from "../utils/test-constants";
import uppercase from "../utils/schemas/schemaWithFunctions/uppercase";

test(`processes variables passed with schema path`, async () => {
  expect(
    await markdoc({ schema: "./utils/schemas/schemaWithFunctions" }).markup({
      content: markdocWithFunction,
      filename: "test.md",
    }),
  ).toMatchSnapshot();
});

test(`processes variables passed directly`, async () => {
  expect(
    await markdoc({
      functions: { uppercase },
    }).markup({
      content: markdocWithFunction,
      filename: "test.md",
    }),
  ).toMatchSnapshot();
});
