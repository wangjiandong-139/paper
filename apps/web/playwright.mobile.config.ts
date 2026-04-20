import { defineConfig, devices } from '@playwright/test'

/**
 * 仅跑移动端（iPhone 14）的 Playwright 配置，供本地快速验证与 CI 分项目执行。
 * 桌面端见 playwright.config.ts。
 */
export default defineConfig({
  testDir: './e2e',
  /** 移动端专用配置：只跑视口/触摸相关用例，完整向导流见 playwright.config.ts */
  testMatch: '**/mobile-viewport.spec.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-iphone14',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
