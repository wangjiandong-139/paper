/** @type {import('jest').Config} */
const path = require('path');

// When `jest` runs with cwd = apps/server, Jest does not walk up to the monorepo
// root for config; without this file it falls back to babel-jest defaults (no TS
// types, no path aliases), which breaks server tests that import @ai-paper/shared.
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: path.join(__dirname, '../../tsconfig.base.json') },
    ],
  },
  // Default `pnpm test` stays DB-free. E2E lives in `test/*.e2e-spec.ts` — run `pnpm test:e2e` with DATABASE_URL.
  testMatch: [
    '<rootDir>/__tests__/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/tests/**/*.spec.ts',
    '<rootDir>/tests/**/*.test.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@ai-paper/shared$': path.join(__dirname, '../../packages/shared/src/index.ts'),
  },
};
