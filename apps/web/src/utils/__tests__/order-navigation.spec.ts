import { describe, it, expect } from 'vitest'
import {
  getOrderNavTarget,
  isOrderNavigable,
  formatOrderDate,
  formatPrice,
  ORDER_STATUS_DISPLAY,
} from '@/utils/order-navigation'
import { OrderStatus, PlanType } from '@/types/order'
import type { OrderDTO } from '@/types/order'

// ─── helpers ──────────────────────────────────────────────────

function makeOrder(status: OrderStatus, id = 'order-001'): OrderDTO {
  return {
    id,
    draftId: 'draft-001',
    planType: PlanType.BASIC,
    planPrice: 9900,
    status,
    aiRevisionCount: 0,
    createdAt: '2024-06-01T08:00:00.000Z',
    updatedAt: '2024-06-01T08:00:00.000Z',
  }
}

// ─── getOrderNavTarget ──────────────────────────────────────────────────

describe('getOrderNavTarget', () => {
  it('GENERATING → /wizard/5 并携带 orderId', () => {
    const target = getOrderNavTarget(makeOrder(OrderStatus.GENERATING))
    expect(target.path).toBe('/wizard/5')
    expect(target.query?.orderId).toBe('order-001')
  })

  it('COMPLETED → /wizard/6 并携带 orderId', () => {
    const target = getOrderNavTarget(makeOrder(OrderStatus.COMPLETED))
    expect(target.path).toBe('/wizard/6')
    expect(target.query?.orderId).toBe('order-001')
  })

  it('PENDING_PAYMENT → /wizard/1 并携带 draftId', () => {
    const target = getOrderNavTarget(makeOrder(OrderStatus.PENDING_PAYMENT))
    expect(target.path).toBe('/wizard/1')
    expect(target.query?.draftId).toBe('draft-001')
  })

  it('FAILED → /wizard/1 并携带 draftId', () => {
    const target = getOrderNavTarget(makeOrder(OrderStatus.FAILED))
    expect(target.path).toBe('/wizard/1')
    expect(target.query?.draftId).toBe('draft-001')
  })

  it('GENERATING 时 query 包含正确的 orderId', () => {
    const target = getOrderNavTarget(makeOrder(OrderStatus.GENERATING, 'order-xyz'))
    expect(target.query?.orderId).toBe('order-xyz')
  })
})

// ─── isOrderNavigable ──────────────────────────────────────────────────

describe('isOrderNavigable', () => {
  it('PENDING_PAYMENT 可导航', () => {
    expect(isOrderNavigable(makeOrder(OrderStatus.PENDING_PAYMENT))).toBe(true)
  })

  it('GENERATING 可导航', () => {
    expect(isOrderNavigable(makeOrder(OrderStatus.GENERATING))).toBe(true)
  })

  it('COMPLETED 可导航', () => {
    expect(isOrderNavigable(makeOrder(OrderStatus.COMPLETED))).toBe(true)
  })

  it('FAILED 不可导航', () => {
    expect(isOrderNavigable(makeOrder(OrderStatus.FAILED))).toBe(false)
  })
})

// ─── ORDER_STATUS_DISPLAY ──────────────────────────────────────────────────

describe('ORDER_STATUS_DISPLAY', () => {
  it('所有 OrderStatus 都有对应展示配置', () => {
    for (const status of Object.values(OrderStatus)) {
      expect(ORDER_STATUS_DISPLAY[status]).toBeDefined()
      expect(ORDER_STATUS_DISPLAY[status].label).toBeTruthy()
    }
  })

  it('GENERATING 的 type 为 primary', () => {
    expect(ORDER_STATUS_DISPLAY[OrderStatus.GENERATING].type).toBe('primary')
  })

  it('COMPLETED 的 type 为 success', () => {
    expect(ORDER_STATUS_DISPLAY[OrderStatus.COMPLETED].type).toBe('success')
  })

  it('PENDING_PAYMENT 的 type 为 warning', () => {
    expect(ORDER_STATUS_DISPLAY[OrderStatus.PENDING_PAYMENT].type).toBe('warning')
  })

  it('FAILED 的 type 为 danger', () => {
    expect(ORDER_STATUS_DISPLAY[OrderStatus.FAILED].type).toBe('danger')
  })
})

// ─── formatOrderDate ──────────────────────────────────────────────────

describe('formatOrderDate', () => {
  it('返回包含年月日格式的字符串', () => {
    const result = formatOrderDate('2024-06-01T08:00:00.000Z')
    // 格式因时区不同，但必须包含 2024
    expect(result).toContain('2024')
  })

  it('返回非空字符串', () => {
    expect(formatOrderDate('2024-01-15T12:30:00.000Z')).toBeTruthy()
  })
})

// ─── formatPrice ──────────────────────────────────────────────────

describe('formatPrice', () => {
  it('9900 分格式化为 ¥99.00', () => {
    expect(formatPrice(9900)).toBe('¥99.00')
  })

  it('0 分格式化为 ¥0.00', () => {
    expect(formatPrice(0)).toBe('¥0.00')
  })

  it('100 分格式化为 ¥1.00', () => {
    expect(formatPrice(100)).toBe('¥1.00')
  })

  it('结果以 ¥ 开头', () => {
    expect(formatPrice(5000)).toMatch(/^¥/)
  })
})
