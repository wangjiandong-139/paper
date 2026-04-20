import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { isWechatBrowser, invokeWechatJsapi, usePayment } from '@/composables/usePayment'
import { OrderStatus, PlanType } from '@/types/order'
import type { WechatJsapiPayParams, CreateOrderResponseDTO, OrderDTO } from '@/types/order'

// ─── 依赖 mock ──────────────────────────────────────────────────

vi.mock('@/lib/http', () => ({
  http: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

vi.useFakeTimers()

const mockJsapiParams: WechatJsapiPayParams = {
  appId: 'wx_app',
  timeStamp: '1700000000',
  nonceStr: 'abc',
  package: 'prepay_id=test',
  signType: 'RSA',
  paySign: 'sign',
}

const mockNativeResponse: CreateOrderResponseDTO = {
  orderId: 'order-native',
  payParams: { codeUrl: 'weixin://wxpay/bizpayurl?pr=xxx' },
}

const mockJsapiResponse: CreateOrderResponseDTO = {
  orderId: 'order-jsapi',
  payParams: mockJsapiParams,
}

const generatingOrder: OrderDTO = {
  id: 'order-native',
  draftId: 'draft-001',
  planType: PlanType.BASIC,
  planPrice: 9900,
  status: OrderStatus.GENERATING,
  aiRevisionCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const pendingOrder: OrderDTO = {
  ...generatingOrder,
  status: OrderStatus.PENDING_PAYMENT,
}

// ─── isWechatBrowser ──────────────────────────────────────────────────

describe('isWechatBrowser', () => {
  const originalUA = navigator.userAgent

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    })
  })

  it('微信 UA 返回 true', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10) MicroMessenger/8.0.0',
      configurable: true,
    })
    expect(isWechatBrowser()).toBe(true)
  })

  it('普通 Chrome UA 返回 false', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      configurable: true,
    })
    expect(isWechatBrowser()).toBe(false)
  })
})

// ─── invokeWechatJsapi ──────────────────────────────────────────────────

describe('invokeWechatJsapi', () => {
  afterEach(() => {
    delete (window as typeof window & { WeixinJSBridge?: unknown }).WeixinJSBridge
  })

  it('WeixinJSBridge 不存在时返回失败', async () => {
    delete (window as typeof window & { WeixinJSBridge?: unknown }).WeixinJSBridge
    const result = await invokeWechatJsapi(mockJsapiParams)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('微信')
  })

  it('支付成功时返回 success: true', async () => {
    ;(window as typeof window & { WeixinJSBridge: unknown }).WeixinJSBridge = {
      invoke: (_api: string, _params: unknown, cb: (r: { err_msg: string }) => void) => {
        cb({ err_msg: 'get_brand_wcpay_request:ok' })
      },
    }
    const result = await invokeWechatJsapi(mockJsapiParams)
    expect(result.success).toBe(true)
  })

  it('用户取消时返回失败并附带取消提示', async () => {
    ;(window as typeof window & { WeixinJSBridge: unknown }).WeixinJSBridge = {
      invoke: (_api: string, _params: unknown, cb: (r: { err_msg: string }) => void) => {
        cb({ err_msg: 'get_brand_wcpay_request:cancel' })
      },
    }
    const result = await invokeWechatJsapi(mockJsapiParams)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('取消')
  })

  it('其他错误返回 failed 并附带 err_msg', async () => {
    ;(window as typeof window & { WeixinJSBridge: unknown }).WeixinJSBridge = {
      invoke: (_api: string, _params: unknown, cb: (r: { err_msg: string }) => void) => {
        cb({ err_msg: 'get_brand_wcpay_request:fail' })
      },
    }
    const result = await invokeWechatJsapi(mockJsapiParams)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain('fail')
  })
})

// ─── usePayment ──────────────────────────────────────────────────

describe('usePayment', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // 默认非微信环境
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120.0.0.0',
      configurable: true,
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  function makePayment(onSuccess = vi.fn(), onFailed = vi.fn()) {
    const draftId = ref<string | null>('draft-001')
    const planType = ref(PlanType.BASIC)
    return {
      ...usePayment({ draftId, planType, onSuccess, onFailed }),
      draftId,
    }
  }

  it('初始状态为 idle，orderId 为 null', () => {
    const { paymentStep, orderId } = makePayment()
    expect(paymentStep.value).toBe('idle')
    expect(orderId.value).toBeNull()
  })

  it('isPaying 在 idle 时为 false', () => {
    const { isPaying } = makePayment()
    expect(isPaying.value).toBe(false)
  })

  it('draftId 为 null 时 startPayment 设置错误信息', async () => {
    const draftId = ref<string | null>(null)
    const onFailed = vi.fn()
    const payment = usePayment({ draftId, onSuccess: vi.fn(), onFailed })
    await payment.startPayment()
    expect(payment.errorMessage.value).toBeTruthy()
    expect(onFailed).not.toHaveBeenCalled()
  })

  it('PC 端：createOrder 成功后进入 polling 并设置 nativeQrUrl', async () => {
    const { http } = await import('@/lib/http')
    vi.mocked(http.post).mockResolvedValue({ data: mockNativeResponse })
    vi.mocked(http.get).mockResolvedValue({ data: pendingOrder })

    const { paymentStep, nativeQrUrl, startPayment } = makePayment()
    await startPayment()

    expect(paymentStep.value).toBe('polling')
    expect(nativeQrUrl.value).toBe('weixin://wxpay/bizpayurl?pr=xxx')
  })

  it('PC 端：轮询到 GENERATING 状态后调用 onSuccess', async () => {
    const { http } = await import('@/lib/http')
    vi.mocked(http.post).mockResolvedValue({ data: mockNativeResponse })
    vi.mocked(http.get).mockResolvedValueOnce({ data: pendingOrder })
      .mockResolvedValueOnce({ data: generatingOrder })

    const onSuccess = vi.fn()
    const { startPayment, stopPolling } = makePayment(onSuccess)
    await startPayment()

    // 触发第一次轮询（仍为 PENDING）
    await vi.advanceTimersByTimeAsync(2000)
    expect(onSuccess).not.toHaveBeenCalled()

    // 触发第二次轮询（GENERATING）
    await vi.advanceTimersByTimeAsync(2000)
    expect(onSuccess).toHaveBeenCalledWith('order-native')
    stopPolling()
  })

  it('PC 端：轮询到 FAILED 状态后调用 onFailed', async () => {
    const failedOrder: OrderDTO = { ...generatingOrder, status: OrderStatus.FAILED }
    const { http } = await import('@/lib/http')
    vi.mocked(http.post).mockResolvedValue({ data: mockNativeResponse })
    vi.mocked(http.get).mockResolvedValue({ data: failedOrder })

    const onFailed = vi.fn()
    const { startPayment, stopPolling } = makePayment(vi.fn(), onFailed)
    await startPayment()

    await vi.advanceTimersByTimeAsync(2000)
    expect(onFailed).toHaveBeenCalled()
    stopPolling()
  })

  it('创建订单失败时 paymentStep 变为 failed 且 errorMessage 有内容', async () => {
    const { http } = await import('@/lib/http')
    vi.mocked(http.post).mockRejectedValue(new Error('创建订单失败'))

    const onFailed = vi.fn()
    const { paymentStep, errorMessage, startPayment } = makePayment(vi.fn(), onFailed)
    await startPayment()

    expect(paymentStep.value).toBe('failed')
    expect(errorMessage.value).toContain('创建订单失败')
    expect(onFailed).toHaveBeenCalled()
  })

  it('retryPayment 重置状态后重新发起支付', async () => {
    const { http } = await import('@/lib/http')
    vi.mocked(http.post).mockRejectedValueOnce(new Error('临时错误'))
      .mockResolvedValueOnce({ data: mockNativeResponse })
    vi.mocked(http.get).mockResolvedValue({ data: pendingOrder })

    const { paymentStep, startPayment, retryPayment, stopPolling } = makePayment()

    // 第一次失败
    await startPayment()
    expect(paymentStep.value).toBe('failed')

    // 重试成功
    await retryPayment()
    expect(paymentStep.value).toBe('polling')
    stopPolling()
  })

  it('stopPolling 停止后不再调用 getOrder', async () => {
    const { http } = await import('@/lib/http')
    vi.mocked(http.post).mockResolvedValue({ data: mockNativeResponse })
    vi.mocked(http.get).mockResolvedValue({ data: pendingOrder })

    const { startPayment, stopPolling } = makePayment()
    await startPayment()

    await vi.advanceTimersByTimeAsync(2000)
    const callCountBefore = vi.mocked(http.get).mock.calls.length

    stopPolling()
    await vi.advanceTimersByTimeAsync(6000)
    const callCountAfter = vi.mocked(http.get).mock.calls.length

    expect(callCountAfter).toBe(callCountBefore)
  })

  it('isPaying 在 polling 时为 true', async () => {
    const { http } = await import('@/lib/http')
    vi.mocked(http.post).mockResolvedValue({ data: mockNativeResponse })
    vi.mocked(http.get).mockResolvedValue({ data: pendingOrder })

    const { isPaying, startPayment, stopPolling } = makePayment()
    await startPayment()

    expect(isPaying.value).toBe(true)
    stopPolling()
  })

  it('微信环境下：createOrder 成功后进入 paying 并调用 JSAPI', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'MicroMessenger/8.0.0',
      configurable: true,
    })
    ;(window as typeof window & { WeixinJSBridge: unknown }).WeixinJSBridge = {
      invoke: (_api: string, _params: unknown, cb: (r: { err_msg: string }) => void) => {
        cb({ err_msg: 'get_brand_wcpay_request:ok' })
      },
    }

    const { http } = await import('@/lib/http')
    vi.mocked(http.post).mockResolvedValue({ data: mockJsapiResponse })
    vi.mocked(http.get).mockResolvedValue({ data: generatingOrder })

    const onSuccess = vi.fn()
    const { startPayment, stopPolling } = makePayment(onSuccess)
    await startPayment()

    // JSAPI 成功后进入 polling
    await vi.advanceTimersByTimeAsync(2000)
    expect(onSuccess).toHaveBeenCalledWith('order-jsapi')
    stopPolling()

    delete (window as typeof window & { WeixinJSBridge?: unknown }).WeixinJSBridge
  })
})
