import type { Page, Route } from '@playwright/test'
import { OrderStatus, PlanType } from '../../src/types/order'

// ─── Pinia 注入辅助 ──────────────────────────────────────────────────

/** 通过 window.__pinia__ 向 wizard store 注入 draftId 和 drafts */
export async function seedWizardStore(page: Page, draftId = 'draft-001'): Promise<void> {
  const draft = { ...MOCK_DRAFT, id: draftId }
  await page.evaluate(
    ([did, draftData]) => {
      const pinia = (window as unknown as Record<string, unknown>).__pinia__ as
        | { _s: Map<string, Record<string, unknown>> }
        | undefined
      if (!pinia) return

      const wizard = pinia._s.get('wizard')
      if (!wizard) return

      ;(wizard as Record<string, unknown>).currentDraftId = did
      ;(wizard as Record<string, unknown>).drafts = [draftData]
    },
    [draftId, draft] as [string, typeof draft],
  )
}

/**
 * 在 SPA 内部通过 Vue Router 导航到目标路径（不触发整页刷新，保留 Pinia 状态）。
 * 使用前需确保已调用 page.goto('/') 让应用初始化完成。
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    const router = (window as unknown as Record<string, unknown>).__router__ as
      | { push: (path: string) => void }
      | undefined
    if (router) router.push(p)
  }, path)
  // 等待 URL 更新
  await page.waitForURL(`**${path.split('?')[0]}**`, { timeout: 5000 })
  // 等待网络空闲（让 defineAsyncComponent 的懒加载 chunk 完成下载）
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
}

// ─── 公共 Mock 数据 ──────────────────────────────────────────────────

export const MOCK_USER = {
  userId: 'user-001',
  wechatOpenId: 'wx_open_id_001',
  nickname: '测试用户',
  avatarUrl: null,
  onboardingCompleted: true,
}

export const MOCK_AUTH_RESPONSE = {
  token: 'mock-jwt-token-12345',
  user: MOCK_USER,
}

export const MOCK_DRAFT_STEP1_DATA = {
  subject: '计算机科学与技术',
  title: '基于深度学习的图像识别研究',
  language: 'zh',
  degree_type: 'undergraduate',
  word_count: 10000,
  template_id: 'default',
  ai_feed: '',
}

export const MOCK_DRAFT_OUTLINE = [
  {
    id: 'c1',
    title: '第一章 绪论',
    level: 1,
    children: [
      { id: 'c1-1', title: '1.1 研究背景', level: 2, children: [], placeholders: [] },
    ],
    placeholders: [],
  },
  { id: 'c2', title: '第二章 文献综述', level: 1, children: [], placeholders: [] },
  { id: 'c3', title: '第三章 结论', level: 1, children: [], placeholders: [] },
]

export const MOCK_REFERENCES = Array.from({ length: 10 }, (_, i) => ({
  id: `ref-${String(i + 1).padStart(3, '0')}`,
  source: 'SEMANTIC_SCHOLAR',
  title: `深度学习与图像识别研究综述 ${i + 1}`,
  authors: [`作者${i + 1}`, `合作者${i + 1}`],
  journal: '计算机学报',
  year: 2020 + (i % 4),
}))

export const MOCK_DRAFT = {
  id: 'draft-001',
  currentStep: 3,
  step1Data: MOCK_DRAFT_STEP1_DATA,
  step2Data: { references: MOCK_REFERENCES },
  step3Data: { outline: MOCK_DRAFT_OUTLINE },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

export const MOCK_STEP1_DATA = {
  subject: '计算机科学与技术',
  title: '基于深度学习的图像识别研究',
  language: 'zh',
  degree_type: 'undergraduate',
  word_count: 10000,
  template_id: 'template-default',
  ai_feed: '',
}

export const MOCK_OUTLINE = [
  {
    id: 'c1',
    title: '第一章 绪论',
    level: 1,
    children: [
      { id: 'c1-1', title: '1.1 研究背景', level: 2, children: [] },
      { id: 'c1-2', title: '1.2 研究目的', level: 2, children: [] },
    ],
    placeholders: [],
  },
  {
    id: 'c2',
    title: '第二章 文献综述',
    level: 1,
    children: [],
    placeholders: [],
  },
  {
    id: 'c3',
    title: '第三章 结论',
    level: 1,
    children: [],
    placeholders: [],
  },
]

export const MOCK_ORDER = {
  id: 'order-001',
  draftId: 'draft-001',
  planType: PlanType.BASIC,
  planPrice: 9900,
  status: OrderStatus.PENDING_PAYMENT,
  aiRevisionCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

// ─── Mock 路由辅助函数 ──────────────────────────────────────────────────

/** 注册所有基础 API mock */
export async function setupBasicApiMocks(page: Page): Promise<void> {
  // 认证相关
  await page.route('**/api/auth/wechat/qrcode', (route) =>
    route.fulfill({ json: { qrcodeUrl: 'https://mp.weixin.qq.com/qrcode/test', sceneId: 'scene-001' } }),
  )
  await page.route('**/api/auth/wechat/qrcode/poll**', (route) =>
    route.fulfill({ json: { status: 'confirmed', ...MOCK_AUTH_RESPONSE } }),
  )

  // 用户
  await page.route('**/api/users/me', (route) =>
    route.fulfill({ json: MOCK_USER }),
  )

  // 草稿
  await page.route('**/api/drafts', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: [MOCK_DRAFT] })
    }
    return route.fulfill({ json: { ...MOCK_DRAFT, id: 'draft-new' } })
  })

  await page.route('**/api/drafts/*/step/*', (route) =>
    route.fulfill({ json: { ...MOCK_DRAFT, currentStep: 2 } }),
  )

  // 文献推荐
  await page.route('**/api/references/suggest**', (route) =>
    route.fulfill({ json: { items: MOCK_REFERENCES, total: 2 } }),
  )
}

/** 注册提纲生成 SSE mock */
export async function mockOutlineGenerateSSE(page: Page): Promise<void> {
  const sseData = `data: ${JSON.stringify({ outline: MOCK_OUTLINE })}\n\n`
  await page.route('**/api/outlines/generate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseData,
    }),
  )
}

/** 注册订单创建和支付 mock（PC Native 模式） */
export async function mockOrderPayment(page: Page): Promise<void> {
  await page.route('**/api/orders', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        json: {
          orderId: 'order-001',
          payParams: { codeUrl: 'weixin://wxpay/bizpayurl?pr=test123' },
        },
      })
    }
    return route.fulfill({ json: [MOCK_ORDER] })
  })
}

/** 轮询 mock：先返回 PENDING，再返回 GENERATING */
export async function mockOrderPolling(page: Page, targetStatus = OrderStatus.GENERATING): Promise<void> {
  let callCount = 0
  await page.route('**/api/orders/order-001', (route: Route) => {
    callCount++
    const status = callCount >= 2 ? targetStatus : OrderStatus.PENDING_PAYMENT
    return route.fulfill({
      json: { ...MOCK_ORDER, id: 'order-001', status },
    })
  })
}

/** 注册生成进度 SSE mock */
export async function mockGenerationProgressSSE(page: Page): Promise<void> {
  const events = [
    {
      type: 'chapter_complete',
      orderId: 'order-001',
      chapter: { index: 0, title: '第一章 绪论', wordCount: 3000 },
      totalChapters: 3,
      completedChapters: 1,
      progress: 33,
    },
    {
      type: 'chapter_complete',
      orderId: 'order-001',
      chapter: { index: 1, title: '第二章 文献综述', wordCount: 3500 },
      totalChapters: 3,
      completedChapters: 2,
      progress: 67,
    },
    {
      type: 'all_complete',
      orderId: 'order-001',
      totalChapters: 3,
      completedChapters: 3,
      progress: 100,
    },
  ]
  const sseBody = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')
  await page.route('**/api/orders/order-001/progress', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody,
    }),
  )
}

/** 注册论文内容和下载 mock */
export async function mockPaperContent(page: Page): Promise<void> {
  await page.route('**/api/orders/order-001/content', (route) =>
    route.fulfill({
      json: {
        html: '<h1>第一章 绪论</h1><p>本文研究深度学习在图像识别领域的应用…</p>',
        aiRevisionCount: 0,
      },
    }),
  )

  await page.route('**/api/orders/order-001/citation-check', (route) =>
    route.fulfill({
      json: {
        traceable: [{ text: '引用1', reference: '[1]' }],
        untraceable: [],
        checkedAt: '2024-01-01T00:00:00.000Z',
      },
    }),
  )

  await page.route('**/api/orders/order-001/plagiarism-check', (route) =>
    route.fulfill({
      json: {
        overallRate: 8,
        provider: 'wanfang',
        checkedAt: '2024-01-01T00:00:00.000Z',
      },
    }),
  )

  await page.route('**/api/orders/order-001/download', (route) =>
    route.fulfill({
      json: { downloadUrl: 'https://cdn.example.com/paper.docx' },
    }),
  )
}
