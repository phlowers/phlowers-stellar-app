const { PyodidePlugin } = require('@pyodide/webpack-plugin');

module.exports = {
  module: {
    parser: {
      javascript: {
        // importMeta: false,
        url: true 
    },
    rules: [
      {
        test: /\.py$/i,
        use: 'raw-loader'
      }
    ]
  },
  // experiments: {
  //   asyncWebAssembly: true,
  //   topLevelAwait: true
  // },
  // output: {
  //   module: true,
  //   libraryTarget: 'module'
  // },
  plugins: [new PyodidePlugin()],
  externals: {
    'node:fs': '{}',
    'node:path': '{}',
    'node:url': '{}',
    'node:vm': '{}',
    'node:fs/promises': '{}',
    'node:crypto': '{}',
    'node:child_process': '{}'
  }
};
