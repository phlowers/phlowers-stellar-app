const { PyodidePlugin } = require("@pyodide/webpack-plugin");

module.exports = {
  module: {
    rules: [
      {
        test: /\.py$/i,
        use: "raw-loader",
      },
    ],
  },
  plugins: [new PyodidePlugin()],
  externals: {
    "node:fs": "{}",
    "node:path": "{}",
    "node:url": "{}",
    "node:vm": "{}",
    "node:fs/promises": "{}",
    "node:crypto": "{}",
    "node:child_process": "{}",
  },
};
