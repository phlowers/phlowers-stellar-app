import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import tsParser from '@typescript-eslint/parser';
import templateParser from '@angular-eslint/template-parser';

export default tseslint.config(
  {
    ignores: [
      'coverage/**',
      'dist/**',
      '**/.venv/**',
      '.angular/**',
      'docs-sphinx/**',
      'public/pyodide/**',
      'public/service-worker.js'
    ]
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.stylistic],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    processor: angular.processInlineTemplates,
    plugins: {
      '@angular-eslint': angular.tsPlugin
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase'
        }
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: ['attribute', 'element'],
          prefix: 'app',
          style: 'kebab-case'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message: 'Use globalThis instead of window for cross-environment compatibility.'
        }
      ]
    }
  },
  {
    // Only the adapter composition file may reach into `@adapters`: keeps optional adapters removable.
    files: ['src/app/**/*.ts'],
    ignores: ['src/app/shared/import/section-adapter/section-import-adapters.providers.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@adapters/*', '@adapters/**'],
              message: 'Import adapters only from shared/import/section-adapter/section-import-adapters.providers.ts.'
            }
          ]
        }
      ]
    }
  },
  {
    // Adapters depend on the public contract and shared code, never on feature code.
    files: ['src/adapters/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['@features/*', '@features/**'], message: 'Adapters must not import feature code.' }]
        }
      ]
    }
  },
  {
    // Only the plugin composition file may reach into `@plugins`: keeps plugins removable.
    // Uses the typescript-eslint variant so it does not override the `@adapters` restriction above.
    files: ['src/app/**/*.ts', 'src/adapters/**/*.ts'],
    ignores: ['src/app/shared/plugin/stellar-plugins.providers.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@plugins/*', '@plugins/**'],
              message: 'Import plugins only from shared/plugin/stellar-plugins.providers.ts.'
            }
          ]
        }
      ]
    }
  },
  {
    // Plugins only talk to Stellar through `@shared/plugin/stellar-plugin` and other `@shared` code.
    files: ['src/plugins/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@app/*',
                '@core/*',
                '@core/**',
                '@services/*',
                '@services/**',
                '@features/*',
                '@features/**',
                '@infrastructure/*',
                '@infrastructure/**',
                '@adapters/*',
                '@adapters/**'
              ],
              message: 'Plugins must use the StellarPluginApi from @shared/plugin/stellar-plugin instead of app internals.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: templateParser
    },
    plugins: {
      '@angular-eslint/template': angular.templatePlugin
    },
    rules: {
      '@angular-eslint/template/i18n': [
        'warn',
        {
          checkText: true,
          checkAttributes: false,
          checkId: false
        }
      ]
    }
  }
);
