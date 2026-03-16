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
    // The server caps at 10,000 rows — warn users before they download
    const text = await blob.text()
    const rowCount = text.split('\n').length - 1 // subtract header
    if (rowCount >= 10000) {
      alert(`导出已截断至 10,000 行。当前结果可能不完整，请缩小筛选范围后重新导出。`)
    }
    const finalBlob = new Blob([text], { type: 'text/csv' })
    const url = URL.createObjectURL(finalBlob)
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
