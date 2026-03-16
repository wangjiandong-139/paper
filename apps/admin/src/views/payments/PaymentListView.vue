<template>
  <div class="space-y-4">
    <h1 class="text-lg font-semibold text-gray-900">支付记录</h1>
    <div class="card p-4 flex items-end gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">开始日期</label>
        <input v-model="filters.startDate" type="date" class="input-field w-36 text-sm" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">结束日期</label>
        <input v-model="filters.endDate" type="date" class="input-field w-36 text-sm" />
      </div>
      <button class="btn-primary" @click="loadPayments">搜索</button>
    </div>
    <div class="card overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-gray-400">加载中...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">支付ID</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单ID</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">套餐</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">支付时间</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="payments.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无支付记录</td>
          </tr>
          <tr v-for="p in payments" :key="p.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ p.id.slice(0, 8) }}...</td>
            <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ p.orderId.slice(0, 8) }}...</td>
            <td class="px-4 py-3 text-gray-700">{{ p.productNameSnapshot }}</td>
            <td class="px-4 py-3 font-medium text-gray-900">¥{{ (p.amountFen / 100).toFixed(2) }}</td>
            <td class="px-4 py-3 text-xs text-gray-500">{{ new Date(p.paidAt).toLocaleString('zh-CN') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import type { AdminPaymentListItemDto } from '@ai-paper/shared'

const payments = ref<AdminPaymentListItemDto[]>([])
const isLoading = ref(false)
const filters = ref({ startDate: '', endDate: '' })

async function loadPayments(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/payments', {
      params: {
        startDate: filters.value.startDate || undefined,
        endDate: filters.value.endDate || undefined,
      },
    })
    payments.value = res.data.items ?? []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPayments)
</script>
