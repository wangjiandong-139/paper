<template>
  <button
    class="btn-secondary"
    :disabled="isLoading"
    @click="handleExport"
  >
    <span v-if="isLoading">导出中...</span>
    <span v-else>导出 CSV</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { exportOrders } from '@/services/orders/admin-orders.service'
import type { AdminOrderStatus } from '@ai-paper/shared'

const props = defineProps<{
  filters?: {
    status?: AdminOrderStatus
    startDate?: string
    endDate?: string
  }
}>()

const isLoading = ref(false)

async function handleExport(): Promise<void> {
  isLoading.value = true
  try {
    const blob = await exportOrders(props.filters ?? {})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    isLoading.value = false
  }
}
</script>
