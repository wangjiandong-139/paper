<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold text-gray-900">订单列表</h1>
      <OrderExportButton :filters="exportFilters" />
    </div>

    <!-- Filters -->
    <div class="card p-4 flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">状态</label>
        <select v-model="filters.status" class="input-field w-36 text-sm">
          <option value="">全部</option>
          <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">开始日期</label>
        <input v-model="filters.startDate" type="date" class="input-field w-36 text-sm" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">结束日期</label>
        <input v-model="filters.endDate" type="date" class="input-field w-36 text-sm" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">用户ID</label>
        <input v-model="filters.userId" type="text" class="input-field w-36 text-sm" placeholder="用户ID" />
      </div>
      <button class="btn-primary" @click="applyFilters">搜索</button>
      <button class="btn-secondary" @click="resetFilters">重置</button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-gray-400">加载中...</div>
      <div v-else-if="error" class="p-8 text-center text-red-500">{{ error }}</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单ID</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">套餐</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ order.id.slice(0, 8) }}...</td>
            <td class="px-4 py-3">
              <span class="text-gray-900">{{ order.title }}</span>
              <span v-if="order.hasOverdueJob" class="ml-1 text-yellow-500" title="存在超时任务">⚠️</span>
            </td>
            <td class="px-4 py-3">
              <span :class="orderStatusClass(order.status)" class="badge">{{ orderStatusLabel(order.status) }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ order.productNameSnapshot }}</td>
            <td class="px-4 py-3 text-gray-600">
              {{ order.paidAmountFen !== null ? `¥${(order.paidAmountFen / 100).toFixed(2)}` : '-' }}
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(order.createdAt) }}</td>
            <td class="px-4 py-3">
              <RouterLink :to="`/orders/${order.id}`" class="text-primary-600 hover:text-primary-700 text-xs">
                查看详情
              </RouterLink>
            </td>
          </tr>
          <tr v-if="orders.length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-gray-400">暂无订单</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="total > 0" class="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <span class="text-xs text-gray-500">共 {{ total }} 条</span>
        <div class="flex items-center gap-1">
          <button
            class="btn-secondary text-xs py-1 px-2"
            :disabled="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          >上一页</button>
          <span class="text-xs px-2">{{ currentPage }}</span>
          <button
            class="btn-secondary text-xs py-1 px-2"
            :disabled="currentPage * 20 >= total"
            @click="changePage(currentPage + 1)"
          >下一页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useOrdersStore } from '@/stores/orders.store'
import { storeToRefs } from 'pinia'
import OrderExportButton from '@/components/orders/OrderExportButton.vue'
import { AdminOrderStatus } from '@ai-paper/shared'

const store = useOrdersStore()
const { orders, total, page: currentPage, isLoading, error } = storeToRefs(store)

const filters = ref({
  status: '' as AdminOrderStatus | '',
  startDate: '',
  endDate: '',
  userId: '',
})

const exportFilters = computed(() => ({
  status: filters.value.status || undefined,
  startDate: filters.value.startDate || undefined,
  endDate: filters.value.endDate || undefined,
}))

const statuses = [
  { value: AdminOrderStatus.PENDING_PAYMENT, label: '待支付' },
  { value: AdminOrderStatus.GENERATING, label: '生成中' },
  { value: AdminOrderStatus.COMPLETED, label: '已完成' },
  { value: AdminOrderStatus.FAILED, label: '已失败' },
]

function orderStatusLabel(status: AdminOrderStatus): string {
  const map: Record<AdminOrderStatus, string> = {
    [AdminOrderStatus.PENDING_PAYMENT]: '待支付',
    [AdminOrderStatus.GENERATING]: '生成中',
    [AdminOrderStatus.COMPLETED]: '已完成',
    [AdminOrderStatus.FAILED]: '已失败',
  }
  return map[status]
}

function orderStatusClass(status: AdminOrderStatus): string {
  if (status === AdminOrderStatus.FAILED) return 'badge-danger'
  if (status === AdminOrderStatus.COMPLETED) return 'badge-success'
  if (status === AdminOrderStatus.GENERATING) return 'badge-info'
  return 'badge-gray'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN')
}

function applyFilters(): void {
  store.setFilters({
    status: filters.value.status || undefined,
    startDate: filters.value.startDate || undefined,
    endDate: filters.value.endDate || undefined,
    userId: filters.value.userId || undefined,
  })
  store.loadOrders()
}

function resetFilters(): void {
  filters.value = { status: '', startDate: '', endDate: '', userId: '' }
  store.setFilters({})
  store.loadOrders()
}

function changePage(newPage: number): void {
  store.setPage(newPage)
  store.loadOrders()
}

onMounted(() => {
  store.loadOrders()
})
</script>
