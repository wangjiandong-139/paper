import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrderStore, isTerminalStatus, TERMINAL_STATUSES } from '@/stores/order'
import { OrderStatus, PlanType } from '@/types/order'
import type { OrderDTO, CreateOrderResponseDTO } from '@/types/order'

vi.mock('@/lib/http', () => ({
  http: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

import { http } from '@/lib/http'

const mockOrderDTO: OrderDTO = {
  id: 'order-001',
  draftId: 'draft-001',
  planType: PlanType.BASIC,
  planPrice: 9900,
  status: OrderStatus.PENDING_PAYMENT,
  aiRevisionCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const mockCreateResponse: CreateOrderResponseDTO = {
  orderId: 'order-001',
  payParams: {
    appId: 'wx123',
    timeStamp: '1700000000',
    nonceStr: 'nonce123',
    package: 'prepay_id=wx123',
    signType: 'RSA',
    paySign: 'sign123',
  },
}

describe('useOrderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // ─── 初始状态 ──────────────────────────────────────────────────

  it('初始状态为空', () => {
    const store = useOrderStore()
    expect(store.currentOrderId).toBeNull()
    expect(store.currentOrder).toBeNull()
    expect(store.orders).toEqual([])
    expect(store.loading).toBe(false)
  })

  // ─── createOrder ──────────────────────────────────────────────────

  it('createOrder 成功时设置 currentOrderId 并返回响应', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: mockCreateResponse })
    const store = useOrderStore()

    const result = await store.createOrder('draft-001', PlanType.BASIC)

    expect(http.post).toHaveBeenCalledWith('/orders', {
      draftId: 'draft-001',
      planType: PlanType.BASIC,
    })
    expect(store.currentOrderId).toBe('order-001')
    expect(result.orderId).toBe('order-001')
  })

  it('createOrder 使用默认套餐 BASIC', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: mockCreateResponse })
    const store = useOrderStore()

    await store.createOrder('draft-001')

    expect(http.post).toHaveBeenCalledWith('/orders', {
      draftId: 'draft-001',
      planType: PlanType.BASIC,
    })
  })

  it('createOrder 期间 loading 为 true，完成后为 false', async () => {
    let resolvePost!: (val: unknown) => void
    vi.mocked(http.post).mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve
      }),
    )
    const store = useOrderStore()
    const promise = store.createOrder('draft-001')
    expect(store.loading).toBe(true)
    resolvePost({ data: mockCreateResponse })
    await promise
    expect(store.loading).toBe(false)
  })

  it('createOrder 失败时 loading 恢复 false', async () => {
    vi.mocked(http.post).mockRejectedValue(new Error('网络错误'))
    const store = useOrderStore()
    await expect(store.createOrder('draft-001')).rejects.toThrow('网络错误')
    expect(store.loading).toBe(false)
  })

  // ─── getOrder ──────────────────────────────────────────────────

  it('getOrder 成功时更新 currentOrder', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: mockOrderDTO })
    const store = useOrderStore()

    const result = await store.getOrder('order-001')

    expect(http.get).toHaveBeenCalledWith('/orders/order-001')
    expect(store.currentOrder).toEqual(mockOrderDTO)
    expect(result).toEqual(mockOrderDTO)
  })

  // ─── loadOrders ──────────────────────────────────────────────────

  it('loadOrders 成功时填充 orders 列表', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [mockOrderDTO] })
    const store = useOrderStore()

    await store.loadOrders()

    expect(store.orders).toEqual([mockOrderDTO])
    expect(store.loading).toBe(false)
  })

  // ─── reset ──────────────────────────────────────────────────

  it('reset 清空状态', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: mockCreateResponse })
    const store = useOrderStore()
    await store.createOrder('draft-001')

    store.reset()

    expect(store.currentOrderId).toBeNull()
    expect(store.currentOrder).toBeNull()
  })
})

// ─── isTerminalStatus ──────────────────────────────────────────────────

describe('isTerminalStatus', () => {
  it('GENERATING 是终态', () => {
    expect(isTerminalStatus(OrderStatus.GENERATING)).toBe(true)
  })

  it('COMPLETED 是终态', () => {
    expect(isTerminalStatus(OrderStatus.COMPLETED)).toBe(true)
  })

  it('FAILED 是终态', () => {
    expect(isTerminalStatus(OrderStatus.FAILED)).toBe(true)
  })

  it('PENDING_PAYMENT 不是终态', () => {
    expect(isTerminalStatus(OrderStatus.PENDING_PAYMENT)).toBe(false)
  })

  it('TERMINAL_STATUSES 包含预期的状态', () => {
    expect(TERMINAL_STATUSES).toContain(OrderStatus.GENERATING)
    expect(TERMINAL_STATUSES).toContain(OrderStatus.COMPLETED)
    expect(TERMINAL_STATUSES).toContain(OrderStatus.FAILED)
  })
})
