import dts from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: [
      { file: "dist/main.cjs.js", format: "cjs" },
      { file: "dist/main.mjs", format: "esm" },
    ],
    external: ["fs", "js-yaml", "@markdoc/markdoc", "markdown-it", "path"],
    plugins: [typescript(), nodeResolve()],
  },
  {
    input: "src/index.ts",
    output: [{ file: "dist/main.d.ts" }],
    plugins: [dts(), nodeResolve()],
  },
];
