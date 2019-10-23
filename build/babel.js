/* @flow */

module.exports = {
  babelrc: false,
  ignore: [
    "**/*.test.js",
  ],
  presets: [
    ["@babel/preset-env", {
      loose: true,
      shippedProposals: true,
      targets: {
        node: 10,
        firefox: 50,
        ie: 11,
      },
      exclude: [
        "@babel/plugin-transform-regenerator",
        "transform-typeof-symbol",
        "transform-for-of",
      ],
    }],
  ],
  plugins: [
    // We cannot use the preset since this must go before class-properties
    // to avoid emitting `this.propertyName = void 0;` for typed class
    // properties
    ["@babel/plugin-transform-flow-strip-types"],
    ["@babel/plugin-transform-for-of", { assumeArray: true }],
  ],
};
