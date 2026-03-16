/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.base.json' }],
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/test/**/*.spec.ts',
    '**/test/**/*.e2e-spec.ts',
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.test.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@ai-paper/shared$': '<rootDir>/packages/shared/src/index.ts',
  },
};

