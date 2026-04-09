/// <reference types="vitest/config" />
import { basename } from 'node:path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import viteTsConfigPaths from 'vite-tsconfig-paths';

function pyFileTransformer() {
  return {
    name: 'py-file-transformer',
    transform(_code: string, id: string) {
      if (!id.endsWith('.py')) {
        return null;
      }

      return {
        code: `export default ${JSON.stringify(basename(id))};`,
        map: null
      };
    }
  };
}

/**
 * Workaround for @analogjs/vite-plugin-angular 2.x + Vite 6 incompatibility:
 * Vite 6 does not automatically apply the transform.filter.id declared by plugins —
 * every handler is called for every file. This causes:
 * 1. @analogjs/vite-plugin-angular: processes fesm2022 files that contain @Component,
 *    resolving templateUrl/styleUrls to invalid paths (e.g. 'null|/path/null'),
 *    then calls addWatchFile('/path/null'), which vite:import-analysis fails to resolve.
 * 2. analogjs-router-optimization: runs Babel (without TypeScript plugin) on .ts spec
 *    files, causing SyntaxError on TypeScript-specific syntax.
 * This function enforces the filter.id manually on each plugin's transform handler.
 */
function applyAngularPluginTransformFilters(angularPlugins: ReturnType<typeof angular>) {
  return angularPlugins.map((plugin) => {
    if (
      !plugin.transform ||
      typeof plugin.transform !== 'object' ||
      !('handler' in plugin.transform) ||
      !('filter' in plugin.transform)
    ) {
      return plugin;
    }
    const filter = plugin.transform.filter as { id?: RegExp | { include?: RegExp[]; exclude?: RegExp[] } };
    if (!filter?.id) {
      return plugin;
    }
    const originalHandler = plugin.transform.handler as (
      this: unknown,
      code: string,
      id: string,
      options?: unknown
    ) => unknown;
    const idFilter = filter.id;
    function matchesFilter(id: string): boolean {
      if (idFilter instanceof RegExp) {
        return idFilter.test(id);
      }
      if (typeof idFilter === 'object') {
        const includes = (idFilter as { include?: (RegExp | string)[]; exclude?: (RegExp | string)[] }).include;
        const excludes = (idFilter as { include?: (RegExp | string)[]; exclude?: (RegExp | string)[] }).exclude;
        if (excludes?.some((r) => (r instanceof RegExp ? r.test(id) : id.includes(r)))) return false;
        if (includes && !includes.some((r) => (r instanceof RegExp ? r.test(id) : id.includes(r)))) return false;
        return true;
      }
      return true;
    }
    return {
      ...plugin,
      transform: {
        ...plugin.transform,
        handler: function (this: unknown, code: string, id: string, options?: unknown) {
          if (!matchesFilter(id)) {
            return null;
          }
          return originalHandler.call(this, code, id, options);
        }
      }
    };
  });
}

export default defineConfig(() => ({
  plugins: [
    ...applyAngularPluginTransformFilters(angular()),
    viteTsConfigPaths({
      projects: ['./tsconfig.spec.json']
    }),
    pyFileTransformer()
  ],
  resolve: {
    alias: {
      '@src': '/src',
      '@app': '/src/app',
      '@core': '/src/app/core',
      '@services': '/src/app/core/services',
      '@features': '/src/app/features',
      '@shared': '/src/app/shared',
      '@infrastructure': '/src/app/infrastructure'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    deprecated: {
      disableCallbackTimeout: true,
      ignoreDeprecations: true
    },
    testTimeout: 15000,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['e2e/**'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts', 'src/test-setup.ts']
    }
  }
}));
