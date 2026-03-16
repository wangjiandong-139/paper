import { test, expect } from '@playwright/test'
import {
  setupBasicApiMocks,
  MOCK_AUTH_RESPONSE,
  seedWizardStore,
  navigateTo,
} from './helpers/api-mocks'

async function initApp(
  page: import('@playwright/test').Page,
  opts: { seedWizard?: boolean } = {},
) {
  await page.goto('/')
  await page.evaluate((auth) => {
    localStorage.setItem('ai-paper-auth', JSON.stringify({ token: auth.token, user: auth.user }))
  }, MOCK_AUTH_RESPONSE)
  await page.reload()
  await page.waitForSelector('[data-testid="next-btn"]', { state: 'visible', timeout: 8000 })
  if (opts.seedWizard) await seedWizardStore(page)
}

// ─── 31.2 移动端视口测试（iPhone 14：375×812）─────────────────────────────

test.describe('31.2 移动端视口测试（iPhone 14：375×812）', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await setupBasicApiMocks(page)
  })

  test('向导进度条在移动端可见且宽度不超出视口', async ({ page }) => {
    await initApp(page)
    await navigateTo(page, '/wizard/1')

    const progressBar = page.locator('.wizard-progress')
    await expect(progressBar).toBeVisible()

    const box = await progressBar.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375)
    }
  })

  test('步骤节点触摸热区 ≥ 44px', async ({ page }) => {
    await initApp(page)
    await navigateTo(page, '/wizard/1')

    const stepNode = page.getByTestId('step-1')
    await expect(stepNode).toBeVisible()

    const box = await stepNode.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('步骤 1 表单在移动端可见且下一步按钮可访问', async ({ page }) => {
    await initApp(page)
    await navigateTo(page, '/wizard/1')

    // van-field 组件在 DOM 中存在即可（Vant 4 内部结构不依赖 .van-field__control 选择器）
    await expect(page.getByTestId('field-title')).toBeAttached({ timeout: 5000 })

    await page.getByTestId('next-btn').scrollIntoViewIfNeeded()
    await expect(page.getByTestId('next-btn')).toBeVisible()
  })

  test('步骤 4 支付按钮在移动端可见且触摸热区 ≥ 44px', async ({ page }) => {
    await initApp(page)
    await navigateTo(page, '/wizard/4')

    const payBtn = page.getByTestId('pay-button')
    await expect(payBtn).toBeVisible()

    const box = await payBtn.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('步骤 5 在移动端进度区域不溢出视口', async ({ page }) => {
    // 模拟 SSE 流正常工作，避免 empty body 导致状态异常跳转
    await page.route('**/api/orders/order-001/progress', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({
          type: 'chapter_complete',
          orderId: 'order-001',
          chapter: { index: 0, title: '第一章', wordCount: 3000 },
          totalChapters: 3,
          completedChapters: 1,
          progress: 33,
        })}\n\n`,
      }),
    )

    await initApp(page)
    await navigateTo(page, '/wizard/5?orderId=order-001')

    // 等待组件加载（chapter-item 存在于 DOM 即可）
    await page.waitForSelector('[data-testid="chapter-item"]', { state: 'attached', timeout: 5000 })

    const container = page.locator('.step5-generating')
    await expect(container).toBeAttached({ timeout: 3000 })
    const box = await container.boundingBox()
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375)
    }
  })

  test('订单列表页在移动端正常显示且不溢出', async ({ page }) => {
    await page.route('**/api/orders', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          json: [
            {
              id: 'order-m01',
              draftId: 'draft-001',
              planType: 'BASIC',
              planPrice: 9900,
              status: 'COMPLETED',
              aiRevisionCount: 0,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
        })
      }
      return route.fulfill({ json: {} })
    })

    await initApp(page)
    await navigateTo(page, '/orders')

    await expect(page.getByTestId('order-list')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('order-card-order-m01')).toBeVisible()

    const list = page.getByTestId('order-list')
    const box = await list.boundingBox()
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375)
    }
  })

  test('步骤进度文字在移动端可读（字体 ≥ 10px）', async ({ page }) => {
    await initApp(page)
    await navigateTo(page, '/wizard/3')

    const progressText = page.getByTestId('progress-text')
    await expect(progressText).toBeVisible()
    await expect(progressText).toContainText('3/6')

    const fontSize = await progressText.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize),
    )
    expect(fontSize).toBeGreaterThanOrEqual(10)
  })
})
