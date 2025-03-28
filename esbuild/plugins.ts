// const { nodeExternalsPlugin } = require('esbuild-node-externals');
// import { nodeModulesPolyfillPlugin } from 'esbuild-plugins-node-modules-polyfill';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';

export default polyfillNode({
  //   fallback: 'empty',
  //   modules: ['fs', 'url']
  polyfills: {
    url: true
  }
});
