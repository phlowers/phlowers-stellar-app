// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint
  .config(eslint.configs.recommended, tseslint.configs.recommended, {
    ignores: ["**/dist"],
  })
  .concat(eslintPluginPrettier);
// export default [
//   {
//     language: {
//       parser: "@typescript-eslint/parser",
//     },
//     plugins: ["import", "@typescript-eslint", "sonarjs"],
//     env: {
//       browser: true,
//       node: true,
//       es6: true,
//       jest: true,
//     },
//     parserOptions: {
//       ecmaVersion: 7,
//       ecmaFeatures: {
//         jsx: true,
//       },
//       sourceType: "module",
//       jsxPragma: null,
//     },
//     extends: ["eslint:recommended", "plugin:import/typescript", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended", "plugin:sonarjs/recommended"],
//     rules: {
//       "sonarjs/cognitive-complexity": "warn",
//       "sonarjs/no-identical-expressions": "warn",
//       "sonarjs/elseif-without-else": "warn",
//       "sonarjs/max-switch-cases": "warn",
//       "sonarjs/no-collapsible-if": "warn",
//       "sonarjs/no-collection-size-mischeck": "warn",
//       "sonarjs/no-duplicate-string": "warn",
//       "sonarjs/no-duplicated-branches": "warn",
//       "sonarjs/no-gratuitous-expressions": "warn",
//       "sonarjs/no-identical-functions": "warn",
//       "sonarjs/no-inverted-boolean-check": "warn",
//       "sonarjs/no-nested-switch": "warn",
//       "sonarjs/no-nested-template-literals": "warn",
//       "sonarjs/no-redundant-boolean": "warn",
//       "sonarjs/no-redundant-jump": "warn",
//       "sonarjs/no-same-line-conditional": "warn",
//       "sonarjs/no-small-switch": "warn",
//       "sonarjs/no-unused-collection": "warn",
//       "sonarjs/no-useless-catch": "warn",
//       "sonarjs/prefer-immediate-return": "warn",
//       "sonarjs/prefer-object-literal": "warn",
//       "sonarjs/prefer-single-boolean-return": "warn",
//       "sonarjs/prefer-while": "warn",
//       "prettier/prettier": [
//         "error",
//         {
//           usePrettierrc: true,
//         },
//       ],
//       "max-len": [
//         "warn",
//         {
//           code: 180,
//         },
//       ],
//       "sort-imports": [
//         "error",
//         {
//           ignoreDeclarationSort: true,
//         },
//       ],
//       eqeqeq: ["error", "always"],
//       "no-restricted-imports": ["error"],
//       // Typescript
//       "@typescript-eslint/no-unused-vars": ["error"],
//       "@typescript-eslint/explicit-module-boundary-types": ["off"],
//       "@typescript-eslint/no-explicit-any": ["off"],
//       "@typescript-eslint/no-var-requires": ["off"],
//       "@typescript-eslint/no-duplicate-enum-values": ["off"],
//       "no-console": "error",
//       // Plugin import rules
//       "import/no-duplicates": ["warn"],
//       "import/no-extraneous-dependencies": ["error"],
//     },
//     settings: {},
//     overrides: [],
//   },
// ];
