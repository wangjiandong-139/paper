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

      <!-- Funnel (6 steps) -->
      <div v-if="funnel" class="card p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">用户转化漏斗</h2>
        <div class="space-y-2">
          <div
            v-for="step in funnelSteps"
            :key="step.label"
            class="flex items-center gap-3"
          >
            <span class="text-xs text-gray-500 w-24 shrink-0 text-right">{{ step.label }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                class="h-full bg-primary-500 rounded-full transition-all"
                :style="{ width: step.pct + '%' }"
              />
            </div>
            <span class="text-xs font-medium text-gray-700 w-16 text-right">
              {{ step.count.toLocaleString() }}
              <span class="text-gray-400">（{{ step.pct }}%）</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Failure reasons distribution -->
      <div v-if="failureReasons && failureReasons.items.length > 0" class="card p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">失败原因分布</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-gray-400 border-b border-gray-100">
              <th class="text-left pb-2">原因</th>
              <th class="text-right pb-2">数量</th>
              <th class="text-right pb-2">占比</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="item in failureReasons.items" :key="item.reason">
              <td class="py-2 text-gray-800">{{ item.reason }}</td>
              <td class="py-2 text-right font-medium text-red-500">{{ item.count }}</td>
              <td class="py-2 text-right text-gray-500 text-xs">
                {{ totalFailures > 0 ? ((item.count / totalFailures) * 100).toFixed(1) : '0' }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Revenue distribution -->
      <RevenueDistributionPanel v-if="revenue" :data="revenue" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import RevenueDistributionPanel from '@/components/dashboard/RevenueDistributionPanel.vue'
import type { DashboardOverviewDto, DashboardRevenueDto, DashboardTimeRange, DashboardFunnelDto, DashboardFailureReasonsDto } from '@ai-paper/shared'

const isLoading = ref(false)
const overview = ref<DashboardOverviewDto | null>(null)
const revenue = ref<DashboardRevenueDto | null>(null)
const funnel = ref<DashboardFunnelDto | null>(null)
const failureReasons = ref<DashboardFailureReasonsDto | null>(null)
const activeRange = ref<DashboardTimeRange>('week')

const timeRanges = [
  { value: 'day' as DashboardTimeRange, label: '今日' },
  { value: 'week' as DashboardTimeRange, label: '本周' },
  { value: 'month' as DashboardTimeRange, label: '本月' },
]

const funnelSteps = computed(() => {
  if (!funnel.value) return []
  const base = funnel.value.step1Count || 1
  return [
    { label: '进入向导', count: funnel.value.step1Count },
    { label: '填写题目', count: funnel.value.step2Count },
    { label: '确认大纲', count: funnel.value.outlineConfirmedCount },
    { label: '支付成功', count: funnel.value.paidCount },
    { label: '生成中', count: funnel.value.generatingCount },
    { label: '生成完成', count: funnel.value.completedCount },
  ].map((s) => ({
    ...s,
    pct: Math.round((s.count / base) * 100),
  }))
})

const totalFailures = computed(() =>
  failureReasons.value?.items.reduce((sum, i) => sum + i.count, 0) ?? 0,
)

async function loadDashboard(): Promise<void> {
  isLoading.value = true
  try {
    const params = { range: activeRange.value }
    const [overviewRes, revenueRes, funnelRes, failRes] = await Promise.allSettled([
      adminApi.get('/dashboard/overview', { params }),
      adminApi.get('/dashboard/revenue', { params }),
      adminApi.get('/dashboard/funnel', { params }),
      adminApi.get('/dashboard/failure-reasons', { params }),
    ])
    if (overviewRes.status === 'fulfilled') overview.value = overviewRes.value.data
    if (revenueRes.status === 'fulfilled') revenue.value = revenueRes.value.data
    if (funnelRes.status === 'fulfilled') funnel.value = funnelRes.value.data
    if (failRes.status === 'fulfilled') failureReasons.value = failRes.value.data
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
