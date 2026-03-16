import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchOrders } from '@/services/orders/admin-orders.service'
import type { AdminOrderListItemDto, AdminOrderListQueryDto, PaginatedDto } from '@ai-paper/shared'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<AdminOrderListItemDto[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<AdminOrderListQueryDto>({})

  async function loadOrders(query?: AdminOrderListQueryDto): Promise<void> {
    isLoading.value = true
    error.value = null
    if (query) filters.value = query
    try {
      const result: PaginatedDto<AdminOrderListItemDto> = await fetchOrders({
        ...filters.value,
        page: page.value,
        pageSize: pageSize.value,
      })
      orders.value = result.items
      total.value = result.total
    } catch (err: unknown) {
      const e = err as { message?: string }
      error.value = e.message ?? 'Failed to load orders'
    } finally {
      isLoading.value = false
    }
  }

  function setPage(newPage: number): void {
    page.value = newPage
  }

  function setFilters(newFilters: AdminOrderListQueryDto): void {
    filters.value = newFilters
    page.value = 1
  }

  return { orders, total, page, pageSize, isLoading, error, filters, loadOrders, setPage, setFilters }
})
