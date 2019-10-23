/* @flow */

const babelConfig = require("./build/babel");

export default {
  babel: {
    testOptions: {
      ...babelConfig,
      ignore: [],
    },
  },
  files: [
    "**/*.test.js",
  ],
  sources: [
    "src/**/*.js",
  ],
  require: [
    "./test/_register",
  ],
};
