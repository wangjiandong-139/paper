<template>
  <div class="card p-5">
    <h2 class="text-sm font-semibold text-gray-700 mb-4">收入分布（按套餐）</h2>
    <table class="w-full text-sm">
      <thead>
        <tr class="text-xs text-gray-500 border-b border-gray-100">
          <th class="text-left pb-2">套餐</th>
          <th class="text-right pb-2">订单数</th>
          <th class="text-right pb-2">收入</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        <tr v-for="item in data.items" :key="item.productCode">
          <td class="py-2 text-gray-800">{{ item.productName }}</td>
          <td class="py-2 text-right text-gray-600">{{ item.orderCount }}</td>
          <td class="py-2 text-right font-medium text-gray-900">¥{{ (item.totalRevenueFen / 100).toFixed(2) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="border-t border-gray-200">
          <td class="pt-2 text-xs font-medium text-gray-600">合计</td>
          <td />
          <td class="pt-2 text-right font-bold text-gray-900">¥{{ (data.totalRevenueFen / 100).toFixed(2) }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { DashboardRevenueDto } from '@ai-paper/shared'

defineProps<{ data: DashboardRevenueDto }>()
</script>
