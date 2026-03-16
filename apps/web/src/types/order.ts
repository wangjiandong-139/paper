// ─── 枚举 ──────────────────────────────────────────────────

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PlanType {
  BASIC = 'BASIC',
}

// ─── 套餐定义 ──────────────────────────────────────────────────

export interface PlanOption {
  type: PlanType
  name: string
  price: number        // 分
  priceLabel: string   // 展示用，如 "¥99"
  description: string[]
}

export const PLAN_OPTIONS: PlanOption[] = [
  {
    type: PlanType.BASIC,
    name: '基础版',
    price: 9900,
    priceLabel: '¥99',
    description: ['AI 全文生成', '3 次 AI 改稿', '降 AI 痕迹', 'Word/PDF 下载'],
  },
]

// ─── DTO ──────────────────────────────────────────────────

export interface WechatJsapiPayParams {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string
  signType: 'MD5' | 'RSA' | 'HMAC-SHA256'
  paySign: string
}

export interface NativePayParams {
  codeUrl: string  // 二维码内容 URL
}

export interface CreateOrderResponseDTO {
  orderId: string
  payParams: WechatJsapiPayParams | NativePayParams
}

export interface OrderDTO {
  id: string
  draftId: string
  planType: PlanType
  planPrice: number
  status: OrderStatus
  aiRevisionCount: number
  createdAt: string
  updatedAt: string
}

// ─── 支付结果 ──────────────────────────────────────────────────

export type PaymentResult =
  | { success: true; orderId: string }
  | { success: false; error: string }
