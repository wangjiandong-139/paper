<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2">
      <RouterLink to="/users" class="text-sm text-gray-500 hover:text-gray-700">← 返回用户列表</RouterLink>
    </div>
    <div v-if="isLoading" class="text-center text-gray-400 py-8">加载中...</div>
    <template v-else-if="user">
      <div class="card p-5">
        <h1 class="text-lg font-semibold text-gray-900">{{ user.nickname ?? '未设置昵称' }}</h1>
        <p class="text-xs text-gray-400 font-mono mt-1">{{ user.id }}</p>
        <dl class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <dt class="text-xs text-gray-500">状态</dt>
            <dd>
              <span :class="user.isDisabled ? 'badge-danger' : 'badge-success'" class="badge">
                {{ user.isDisabled ? '已禁用' : '正常' }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">总订单</dt>
            <dd class="text-gray-900 font-medium">{{ user.orderCount }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">已完成</dt>
            <dd class="text-green-600 font-medium">{{ completedCount }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">已失败</dt>
            <dd class="text-red-500 font-medium">{{ failedCount }}</dd>
          </div>
        </dl>
      </div>

      <!-- Recent orders -->
      <div v-if="user.recentOrders && user.recentOrders.length > 0" class="card p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-3">最近订单</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-gray-400 border-b border-gray-100">
              <th class="text-left pb-2">标题</th>
              <th class="text-left pb-2">状态</th>
              <th class="text-right pb-2">金额</th>
              <th class="text-right pb-2">时间</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="ord in user.recentOrders" :key="ord.id">
              <td class="py-2 text-gray-800 truncate max-w-[200px]">{{ ord.title }}</td>
              <td class="py-2">
                <span :class="orderStatusClass(ord.status)" class="badge text-xs">{{ ord.status }}</span>
              </td>
              <td class="py-2 text-right text-gray-600">
                {{ ord.paidAmountFen !== null ? `¥${(ord.paidAmountFen / 100).toFixed(2)}` : '-' }}
              </td>
              <td class="py-2 text-right text-xs text-gray-400">{{ formatDate(ord.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <UserRiskControlForm :user-id="userId" :initial-config="user.riskControl" @updated="loadUser" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { adminApi } from '@/services/http/admin-api'
import UserRiskControlForm from '@/components/users/UserRiskControlForm.vue'
import type { AdminEndUserDetailDto } from '@ai-paper/shared'

const route = useRoute()
const userId = route.params.userId as string

const user = ref<AdminEndUserDetailDto | null>(null)
const isLoading = ref(false)

const completedCount = computed(() =>
  user.value?.recentOrders?.filter((o) => o.status === 'COMPLETED').length ?? 0,
)
const failedCount = computed(() =>
  user.value?.recentOrders?.filter((o) => o.status === 'FAILED').length ?? 0,
)

function orderStatusClass(status: string): string {
  if (status === 'FAILED') return 'badge-danger'
  if (status === 'COMPLETED') return 'badge-success'
  if (status === 'GENERATING') return 'badge-info'
  return 'badge-gray'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN')
}

async function loadUser(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get(`/users/${userId}`)
    user.value = res.data
  } finally {
    isLoading.value = false
  }
}

onMounted(loadUser)
</script>
