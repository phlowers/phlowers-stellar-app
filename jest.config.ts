// import presets from 'jest-preset-angular/presets';
import { output } from '@angular/core';
import { type JestConfigWithTsJest } from 'ts-jest';

// import { compilerOptions } from './tsconfig.json';
const config = {
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '@core/(.*)': '<rootDir>/src/app/core/$1',
    '@ui/(.*)': '<rootDir>/src/app/ui/$1',
    '@plugins/(.*)': '<rootDir>/src/app/plugins/$1',
    '@adapters/(.*)': '<rootDir>/src/app/adapters/$1',
    '@src/(.*)': '<rootDir>/src/$1'
    // ...pathsToModuleNameMapper(compilerOptions.paths)
  },
  modulePaths: ['<rootDir>'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/html-comment',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/no-ng-attributes'
  ],
  reporters: [
    'default',
    [
      'jest-sonar',
      {
        outputDirectory: '.',
        outputName: 'report-task.txt'
      }
    ]
  ],
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  transform: {
    '^.+\\.py$': '<rootDir>/fileTransformer.js',
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        preserveTsModule: true,
        useESM: true,
        diagnostics: {
          ignoreCodes: [1343]
        },
        astTransformers: {
          before: [
            {
              path: 'node_modules/ts-jest-mock-import-meta', // or, alternatively, 'ts-jest-mock-import-meta' directly, without node_modules.
              options: { metaObjectReplacement: { url: 'https://www.url.com' } }
            }
          ]
        }
      }
    ]
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts']
} satisfies JestConfigWithTsJest;

// console.log("config", JSON.stringify(config, null, 2));

export default config;
