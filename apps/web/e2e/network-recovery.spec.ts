import { test, expect } from '@playwright/test'
import { setupBasicApiMocks, MOCK_AUTH_RESPONSE, navigateTo } from './helpers/api-mocks'

async function initApp(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate((auth) => {
    localStorage.setItem('ai-paper-auth', JSON.stringify({ token: auth.token, user: auth.user }))
  }, MOCK_AUTH_RESPONSE)
  await page.reload()
  await page.waitForSelector('[data-testid="next-btn"]', { state: 'visible', timeout: 8000 })
}

// ─── 31.3 网络中断恢复测试（步骤 5 生成中）──────────────────────────────

test.describe('31.3 网络中断恢复测试（步骤 5 生成中）', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicApiMocks(page)
  })

  test('SSE 流提前关闭后触发重连提示（reconnecting-notice 可见）', async ({ page }) => {
    let requestCount = 0

    await page.route('**/api/orders/order-001/progress', async (route) => {
      requestCount++
      if (requestCount === 1) {
        // 第一次：发送一个章节事件后连接关闭，无 all_complete
        const partial = `data: ${JSON.stringify({
          type: 'chapter_complete',
          orderId: 'order-001',
          chapter: { index: 0, title: '第一章', wordCount: 3000 },
          totalChapters: 3,
          completedChapters: 1,
          progress: 33,
        })}\n\n`
        return route.fulfill({ status: 200, contentType: 'text/event-stream', body: partial })
      }
      // 后续重连：发送完整流
      const full =
        `data: ${JSON.stringify({
          type: 'chapter_complete',
          orderId: 'order-001',
          chapter: { index: 1, title: '第二章', wordCount: 3500 },
          totalChapters: 3,
          completedChapters: 2,
          progress: 67,
        })}\n\n` +
        `data: ${JSON.stringify({
          type: 'all_complete',
          orderId: 'order-001',
          totalChapters: 3,
          completedChapters: 3,
          progress: 100,
        })}\n\n`
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: full })
    })

    await initApp(page)
    await navigateTo(page, '/wizard/5?orderId=order-001')

    // 第一章 van-cell 存在于 DOM 即可（Vant van-cell 不总是被 Playwright 识别为 visible）
    await page.waitForSelector('[data-testid="chapter-item"]', { state: 'attached', timeout: 5000 })

    // 重连提示出现（van-notice-bar 使用 attached 检测）
    await page.waitForSelector('[data-testid="reconnecting-notice"]', { state: 'attached', timeout: 10000 })

    // 重连后完成整个生成
    await expect(page.getByTestId('complete-overlay')).toBeVisible({ timeout: 15000 })
  })

  test('重连后相同章节不重复添加（去重逻辑生效）', async ({ page }) => {
    await page.route('**/api/orders/order-001/progress', async (route) => {
      // 每次都发送相同 index=0 的章节（模拟重连接收重复事件）
      const body = `data: ${JSON.stringify({
        type: 'chapter_complete',
        orderId: 'order-001',
        chapter: { index: 0, title: '第一章', wordCount: 3000 },
        totalChapters: 3,
        completedChapters: 1,
        progress: 33,
      })}\n\n`
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body })
    })

    await initApp(page)
    await navigateTo(page, '/wizard/5?orderId=order-001')

    // 等待第一章 van-cell 出现在 DOM
    await page.waitForSelector('[data-testid="chapter-item"]', { state: 'attached', timeout: 5000 })

    // 等待至少一次重连（重连后会重新收到相同章节事件）
    await page.waitForTimeout(3000)

    // 相同章节只出现一次（去重）
    await expect(page.locator('[data-testid="chapter-item"]')).toHaveCount(1)
  })

  test('SSE error 事件类型直接显示 error-state', async ({ page }) => {
    await page.route('**/api/orders/order-001/progress', (route) => {
      const body = `data: ${JSON.stringify({
        type: 'error',
        orderId: 'order-001',
        totalChapters: 3,
        completedChapters: 1,
        progress: 33,
        error: 'AI 生成服务暂时不可用',
      })}\n\n`
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body })
    })

    await initApp(page)
    await navigateTo(page, '/wizard/5?orderId=order-001')

    await expect(page.getByTestId('error-state')).toBeVisible({ timeout: 5000 })
  })

  test('fetch 网络错误触发重连提示', async ({ page }) => {
    // 第一次 abort，第二次成功
    let count = 0
    await page.route('**/api/orders/order-001/progress', async (route) => {
      count++
      if (count === 1) return route.abort('failed')
      const body = `data: ${JSON.stringify({
        type: 'all_complete',
        orderId: 'order-001',
        totalChapters: 0,
        completedChapters: 0,
        progress: 100,
      })}\n\n`
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body })
    })

    await initApp(page)
    await navigateTo(page, '/wizard/5?orderId=order-001')

    // 第一次 abort 后应出现重连提示（van-notice-bar 用 attached 检测）
    await page.waitForSelector('[data-testid="reconnecting-notice"]', { state: 'attached', timeout: 5000 })

    // 第二次成功后应完成
    await expect(page.getByTestId('complete-overlay')).toBeVisible({ timeout: 10000 })
  })
})
