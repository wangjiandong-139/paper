/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.base.json' }],
  },
  // Root Jest: shared + server unit/contract/integration only (not admin/web Vitest, not server e2e).
  testMatch: [
    '<rootDir>/packages/**/__tests__/**/*.test.ts',
    '<rootDir>/apps/server/__tests__/**/*.test.ts',
    '<rootDir>/apps/server/test/**/*.spec.ts',
    '<rootDir>/apps/server/tests/**/*.spec.ts',
    '<rootDir>/apps/server/tests/**/*.test.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@ai-paper/shared$': '<rootDir>/packages/shared/src/index.ts',
  },
};

