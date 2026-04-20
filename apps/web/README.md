# @ai-paper/web

Vue 3 + Vite 用户端（向导、订单、支付等）。

## 端到端测试（Playwright）

- **全量（桌面 + 移动端项目）**：在仓库根目录执行  
  `pnpm --filter @ai-paper/web run test:e2e`  
  使用 `playwright.config.ts`，包含 `desktop-chrome` 与 `mobile-iphone14` 两个 project。
- **仅移动端（CI 同款）**：  
  `pnpm --filter @ai-paper/web run test:e2e:mobile`  
  使用 `playwright.mobile.config.ts`，仅 WebKit / iPhone 14 视口，且只匹配 `e2e/mobile-viewport.spec.ts`。

首次在本机跑 E2E 前需安装浏览器（至少 WebKit，若跑全量还需 Chromium 等）：

```bash
pnpm --filter @ai-paper/web exec playwright install
# 或仅移动端依赖：
pnpm --filter @ai-paper/web exec playwright install webkit
```

GitHub Actions 工作流：`.github/workflows/web-e2e-mobile.yml`（推送/PR 在变更 `apps/web` 时触发）。
