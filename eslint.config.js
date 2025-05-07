// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const tsParser = require('@typescript-eslint/parser');
const angularTemplateEslintPlugin = require('@angular-eslint/eslint-plugin-template');

module.exports = tseslint.config(
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    files: ['**/*.ts'],
    ignores: ['coverage/**', 'dist/**'],
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
          type: 'element',
          prefix: 'app',
          style: 'kebab-case'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  {
    files: ['**/*.html'],
    ignores: ['coverage/**', 'dist/**'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility
    ],
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
