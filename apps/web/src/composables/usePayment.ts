import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { useOrderStore, isTerminalStatus } from '@/stores/order'
import { OrderStatus, PlanType } from '@/types/order'
import type { WechatJsapiPayParams, NativePayParams, PaymentResult } from '@/types/order'

// ─── 微信环境检测 ──────────────────────────────────────────────────

export function isWechatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent)
}

// ─── WeixinJSBridge 类型声明 ──────────────────────────────────────────────────

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke(
        api: string,
        params: Record<string, unknown>,
        callback: (res: { err_msg: string }) => void,
      ): void
    }
  }
}

// ─── 使用 WeixinJSBridge 发起 JSAPI 支付 ──────────────────────────────────────────────────

export function invokeWechatJsapi(params: WechatJsapiPayParams): Promise<PaymentResult> {
  return new Promise((resolve) => {
    const bridge = window.WeixinJSBridge
    if (!bridge) {
      resolve({ success: false, error: '请在微信中打开本页面以完成支付' })
      return
    }
    bridge.invoke(
      'getBrandWCPayRequest',
      {
        appId: params.appId,
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType,
        paySign: params.paySign,
      },
      (res) => {
        if (res.err_msg === 'get_brand_wcpay_request:ok') {
          resolve({ success: true, orderId: '' })
        } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
          resolve({ success: false, error: '已取消支付' })
        } else {
          resolve({ success: false, error: `支付失败：${res.err_msg}` })
        }
      },
    )
  })
}

// ─── 组合式函数 ──────────────────────────────────────────────────

export type PaymentStep = 'idle' | 'creating' | 'paying' | 'polling' | 'success' | 'failed'

export interface UsePaymentOptions {
  draftId: Ref<string | null>
  planType?: Ref<PlanType>
  onSuccess: (orderId: string) => void
  onFailed?: (error: string) => void
}

export interface UsePaymentReturn {
  paymentStep: Ref<PaymentStep>
  orderId: Ref<string | null>
  nativeQrUrl: Ref<string | null>
  errorMessage: Ref<string>
  isInWechat: Ref<boolean>
  isPaying: ReturnType<typeof computed<boolean>>
  startPayment: () => Promise<void>
  retryPayment: () => Promise<void>
  stopPolling: () => void
}

const POLL_INTERVAL_MS = 2000
const POLL_MAX_ATTEMPTS = 150 // 5 分钟

export function usePayment(options: UsePaymentOptions): UsePaymentReturn {
  const { draftId, planType, onSuccess, onFailed } = options
  const orderStore = useOrderStore()

  const paymentStep = ref<PaymentStep>('idle')
  const orderId = ref<string | null>(null)
  const nativeQrUrl = ref<string | null>(null)
  const errorMessage = ref('')
  const isInWechat = ref(false)
  const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const pollAttempts = ref(0)

  const isPaying = computed(
    () => ['creating', 'paying', 'polling'].includes(paymentStep.value),
  )

  function stopPolling(): void {
    if (pollingTimer.value) {
      clearInterval(pollingTimer.value)
      pollingTimer.value = null
    }
  }

  function startPolling(oid: string): void {
    stopPolling()
    pollAttempts.value = 0
    paymentStep.value = 'polling'

    pollingTimer.value = setInterval(async () => {
      pollAttempts.value++
      if (pollAttempts.value > POLL_MAX_ATTEMPTS) {
        stopPolling()
        paymentStep.value = 'failed'
        errorMessage.value = '支付超时，请刷新页面重试'
        onFailed?.('支付超时')
        return
      }
      try {
        const order = await orderStore.getOrder(oid)
        if (isTerminalStatus(order.status)) {
          stopPolling()
          if (order.status === OrderStatus.GENERATING || order.status === OrderStatus.COMPLETED) {
            paymentStep.value = 'success'
            onSuccess(oid)
          } else {
            paymentStep.value = 'failed'
            errorMessage.value = '支付失败，请重试'
            onFailed?.('支付失败')
          }
        }
      } catch {
        // 网络抖动，继续轮询
      }
    }, POLL_INTERVAL_MS)
  }

  async function startPayment(): Promise<void> {
    if (!draftId.value) {
      errorMessage.value = '草稿未找到，请返回步骤 1'
      return
    }
    paymentStep.value = 'creating'
    errorMessage.value = ''

    try {
      const plan = planType?.value ?? PlanType.BASIC
      const response = await orderStore.createOrder(draftId.value, plan)
      orderId.value = response.orderId

      isInWechat.value = isWechatBrowser()

      if (isInWechat.value) {
        // 移动端：调起 JSAPI 支付
        paymentStep.value = 'paying'
        const params = response.payParams as WechatJsapiPayParams
        const result = await invokeWechatJsapi(params)
        if (result.success) {
          // JSAPI 支付成功后仍需轮询订单状态确认
          startPolling(response.orderId)
        } else {
          paymentStep.value = 'failed'
          errorMessage.value = result.error
          onFailed?.(result.error)
        }
      } else {
        // PC 端：展示二维码，轮询订单状态
        const params = response.payParams as NativePayParams
        nativeQrUrl.value = params.codeUrl
        startPolling(response.orderId)
      }
    } catch (err) {
      paymentStep.value = 'failed'
      errorMessage.value = err instanceof Error ? err.message : '创建订单失败，请重试'
      onFailed?.(errorMessage.value)
    }
  }

  async function retryPayment(): Promise<void> {
    stopPolling()
    orderId.value = null
    nativeQrUrl.value = null
    await startPayment()
  }

  return {
    paymentStep,
    orderId,
    nativeQrUrl,
    errorMessage,
    isInWechat,
    isPaying,
    startPayment,
    retryPayment,
    stopPolling,
  }
}
