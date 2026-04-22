import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import tsParser from '@typescript-eslint/parser';
import templateParser from '@angular-eslint/template-parser';

export default tseslint.config(
  {
    ignores: ['coverage/**', 'dist/**', '**/.venv/**', '.angular/**', 'docs-sphinx/**']
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended, ...tseslint.configs.stylistic],
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
