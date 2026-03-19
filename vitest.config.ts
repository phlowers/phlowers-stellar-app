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
  plugins: [
    angular(),
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
