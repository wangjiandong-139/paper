import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '@/lib/http'
import { OrderStatus, PlanType } from '@/types/order'
import type { OrderDTO, CreateOrderResponseDTO } from '@/types/order'

export const useOrderStore = defineStore('order', () => {
  const currentOrderId = ref<string | null>(null)
  const currentOrder = ref<OrderDTO | null>(null)
  const orders = ref<OrderDTO[]>([])
  const loading = ref(false)

  async function createOrder(
    draftId: string,
    planType: PlanType = PlanType.BASIC,
  ): Promise<CreateOrderResponseDTO> {
    loading.value = true
    try {
      const { data } = await http.post<CreateOrderResponseDTO>('/orders', { draftId, planType })
      currentOrderId.value = data.orderId
      return data
    } finally {
      loading.value = false
    }
  }

  async function getOrder(id: string): Promise<OrderDTO> {
    const { data } = await http.get<OrderDTO>(`/orders/${id}`)
    currentOrder.value = data
    return data
  }

  async function loadOrders(): Promise<void> {
    loading.value = true
    try {
      const { data } = await http.get<OrderDTO[]>('/orders')
      orders.value = data
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    currentOrderId.value = null
    currentOrder.value = null
  }

  return {
    currentOrderId,
    currentOrder,
    orders,
    loading,
    createOrder,
    getOrder,
    loadOrders,
    reset,
  }
})

// ─── 支付状态轮询工具 ──────────────────────────────────────────────────

export const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.GENERATING,
  OrderStatus.COMPLETED,
  OrderStatus.FAILED,
]

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}
