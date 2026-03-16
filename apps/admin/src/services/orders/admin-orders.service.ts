import { adminApi } from '@/services/http/admin-api'
import type {
  AdminOrderListQueryDto,
  AdminOrderListItemDto,
  AdminOrderDetailDto,
  GenerationJobDetailDto,
  PaginatedDto,
} from '@ai-paper/shared'

export async function fetchOrders(
  query: AdminOrderListQueryDto,
): Promise<PaginatedDto<AdminOrderListItemDto>> {
  const response = await adminApi.get('/orders', { params: query })
  return response.data
}

export async function fetchOrderDetail(orderId: string): Promise<AdminOrderDetailDto> {
  const response = await adminApi.get(`/orders/${orderId}`)
  return response.data
}

export async function retryOrderGeneration(orderId: string): Promise<{ jobId: string }> {
  const response = await adminApi.post(`/orders/${orderId}/retry-generation`)
  return response.data
}

export async function updateOrderNote(orderId: string, note: string): Promise<void> {
  await adminApi.patch(`/orders/${orderId}/note`, { note })
}

export async function exportOrders(query: {
  status?: string
  startDate?: string
  endDate?: string
}): Promise<Blob> {
  const response = await adminApi.get('/orders/export', {
    params: query,
    responseType: 'blob',
  })
  return response.data as Blob
}

export async function fetchGenerationJobDetail(jobId: string): Promise<GenerationJobDetailDto> {
  const response = await adminApi.get(`/generation-jobs/${jobId}`)
  return response.data
}

export async function cancelGenerationJob(jobId: string): Promise<void> {
  await adminApi.post(`/generation-jobs/${jobId}/cancel`)
}

export async function retryGenerationJob(jobId: string): Promise<{ jobId: string }> {
  const response = await adminApi.post(`/generation-jobs/${jobId}/retry`)
  return response.data
}
