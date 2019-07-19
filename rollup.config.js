import babel from "rollup-plugin-babel";

export default {
  input: "src/index.js",
  output: [
    {
      file:  "dist/index.js",
      format: "cjs",
      sourcemap: true,
    },
    {
      file:  "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
  ],
  plugins: [
    babel({
      babelrc: false,
      externalHelpers: false,
      runtimeHelpers: false,
      presets: [
        ["@babel/preset-env", {
          loose: true,
          shippedProposals: true,
          targets: {
            node: 8,
            firefox: 50,
            ie: 11,
          },
          exclude: [ "transform-typeof-symbol" ],
        }],
      ],
      plugins: [
        // We cannot use the preset since this must go before class-properties to avoid
        // emitting `this.propertyName = void 0;` for typed class properties
        ["@babel/plugin-transform-flow-strip-types"],
        // Loose mode for smaller and faster code
        ["@babel/plugin-proposal-class-properties", { loose: true }],
      ],
    }),
  ],
};
