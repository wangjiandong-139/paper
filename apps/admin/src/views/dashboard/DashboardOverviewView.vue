<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold text-gray-900">统计看板</h1>
      <div class="flex items-center gap-1">
        <button
          v-for="range in timeRanges"
          :key="range.value"
          :class="['text-xs px-3 py-1.5 rounded-md border transition-colors',
            activeRange === range.value
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50']"
          @click="setRange(range.value)"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="text-center text-gray-400 py-8">加载中...</div>

    <template v-else>
      <!-- Overview cards -->
      <div class="grid grid-cols-4 gap-4">
        <div class="card p-4">
          <p class="text-xs text-gray-500">总订单</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ overview?.totalOrders ?? 0 }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-500">已完成</p>
          <p class="text-2xl font-bold text-green-600 mt-1">{{ overview?.completedOrders ?? 0 }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-500">失败</p>
          <p class="text-2xl font-bold text-red-500 mt-1">{{ overview?.failedOrders ?? 0 }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-500">总收入</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">
            ¥{{ ((overview?.totalRevenueFen ?? 0) / 100).toFixed(0) }}
          </p>
        </div>
      </div>

      <!-- Revenue distribution -->
      <RevenueDistributionPanel v-if="revenue" :data="revenue" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import RevenueDistributionPanel from '@/components/dashboard/RevenueDistributionPanel.vue'
import type { DashboardOverviewDto, DashboardRevenueDto, DashboardTimeRange } from '@ai-paper/shared'

const isLoading = ref(false)
const overview = ref<DashboardOverviewDto | null>(null)
const revenue = ref<DashboardRevenueDto | null>(null)
const activeRange = ref<DashboardTimeRange>('week')

const timeRanges = [
  { value: 'day' as DashboardTimeRange, label: '今日' },
  { value: 'week' as DashboardTimeRange, label: '本周' },
  { value: 'month' as DashboardTimeRange, label: '本月' },
]

async function loadDashboard(): Promise<void> {
  isLoading.value = true
  try {
    const [overviewRes, revenueRes] = await Promise.all([
      adminApi.get('/dashboard/overview', { params: { range: activeRange.value } }),
      adminApi.get('/dashboard/revenue', { params: { range: activeRange.value } }),
    ])
    overview.value = overviewRes.data
    revenue.value = revenueRes.data
  } catch {
    // silently fail for now
  } finally {
    isLoading.value = false
  }
}

function setRange(range: DashboardTimeRange): void {
  activeRange.value = range
  loadDashboard()
}

onMounted(loadDashboard)
</script>
