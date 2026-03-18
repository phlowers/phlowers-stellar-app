// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const tsParser = require('@typescript-eslint/parser');
const angularTemplateEslintPlugin = require('@angular-eslint/eslint-plugin-template');

module.exports = tseslint.config(
  {
    ignores: ['coverage/**', 'dist/**', '**/.venv/**', '.angular/**', 'docs-sphinx/**']
  },
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended
    ],
    processor: angular.processInlineTemplates,
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
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/i18n': [
        'warn',
        {
          checkText: true,
          checkAttributes: false,
          checkId: false
        }
      ]
    },
    plugins: {
      angularTemplate: angularTemplateEslintPlugin
    }
  }
);
