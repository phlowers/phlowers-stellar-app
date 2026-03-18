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

export default defineConfig(() => ({
  plugins: [angular(), viteTsConfigPaths(), pyFileTransformer()],
  test: {
    globals: true,
    environment: 'jsdom',
    dangerouslyIgnoreUnhandledErrors: true,
    deprecated: {
      disableCallbackTimeout: true,
      ignoreDeprecations: true
    },
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['e2e/**'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts']
    }
  }
}));
