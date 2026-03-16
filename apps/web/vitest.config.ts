import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // 只对核心业务逻辑模块计算覆盖率阈值（视图层 .vue 组件通过 E2E 测试覆盖）
      include: [
        'src/stores/**/*.ts',
        'src/composables/**/*.ts',
        'src/utils/**/*.ts',
        'src/router/**/*.ts',
        'src/types/**/*.ts',
        'src/components/wizard/wizard-progress.ts',
        'src/components/common/onboarding-steps.ts',
        'src/views/wizard/step1-validation.ts',
      ],
      exclude: ['**/__tests__/**', '**/*.spec.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
