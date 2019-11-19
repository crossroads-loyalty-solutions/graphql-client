/* @flow */

import babel from "rollup-plugin-babel";

export default {
  input: "src/index.js",
  output: [
    {
      dir: "dist/cjs",
      format: "cjs",
      sourcemap: true,
    },
    {
      dir: "dist/esm",
      format: "esm",
      sourcemap: true,
    },
  ],
  plugins: [
    babel(require("./build/babel")),
  ],
  preserveModules: true,
  external: [
    "fast-deep-equal",
  ],
};
