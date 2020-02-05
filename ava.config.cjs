/* @flow */

const babelConfig = require("./build/babel");

module.exports = {
  babel: {
    testOptions: {
      ...babelConfig,
      ignore: [],
    },
  },
  files: [
    "**/*.test.js",
  ],
  require: [
    "./test/_register",
  ],
};
