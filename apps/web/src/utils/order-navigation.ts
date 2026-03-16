import { OrderStatus } from '@/types/order'
import type { OrderDTO } from '@/types/order'

// ─── 跳转目标类型 ──────────────────────────────────────────────────

export interface OrderNavTarget {
  path: string
  query?: Record<string, string>
}

// ─── 状态展示配置 ──────────────────────────────────────────────────

export interface OrderStatusDisplay {
  label: string
  color: string   // Vant 颜色 token 或 CSS color
  type: 'primary' | 'success' | 'warning' | 'danger' | 'default'
}

export const ORDER_STATUS_DISPLAY: Record<OrderStatus, OrderStatusDisplay> = {
  [OrderStatus.PENDING_PAYMENT]: {
    label: '待支付',
    color: '#ff976a',
    type: 'warning',
  },
  [OrderStatus.GENERATING]: {
    label: '生成中',
    color: '#1989fa',
    type: 'primary',
  },
  [OrderStatus.COMPLETED]: {
    label: '已完成',
    color: '#07c160',
    type: 'success',
  },
  [OrderStatus.FAILED]: {
    label: '生成失败',
    color: '#ee0a24',
    type: 'danger',
  },
}

// ─── 订单跳转逻辑（纯函数，便于单元测试） ──────────────────────────────────────────────────

/**
 * 根据订单状态决定跳转目标：
 * - PENDING_PAYMENT / FAILED → 步骤 1（重新填写或从草稿继续）
 * - GENERATING               → 步骤 5（查看生成进度）
 * - COMPLETED                → 步骤 6（编辑/下载论文）
 */
export function getOrderNavTarget(order: OrderDTO): OrderNavTarget {
  switch (order.status) {
    case OrderStatus.GENERATING:
      return { path: '/wizard/5', query: { orderId: order.id } }

    case OrderStatus.COMPLETED:
      return { path: '/wizard/6', query: { orderId: order.id } }

    case OrderStatus.PENDING_PAYMENT:
    case OrderStatus.FAILED:
    default:
      return { path: '/wizard/1', query: { draftId: order.draftId } }
  }
}

/**
 * 判断订单是否可点击跳转
 */
export function isOrderNavigable(order: OrderDTO): boolean {
  return [
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.GENERATING,
    OrderStatus.COMPLETED,
  ].includes(order.status)
}

/**
 * 格式化订单创建时间
 */
export function formatOrderDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 格式化套餐价格（分 → 元）
 */
export function formatPrice(fen: number): string {
  return `¥${(fen / 100).toFixed(2)}`
}
