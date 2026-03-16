<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2">
      <RouterLink to="/orders" class="text-sm text-gray-500 hover:text-gray-700">← 返回订单列表</RouterLink>
    </div>

    <div v-if="isLoading" class="text-center text-gray-400 py-8">加载中...</div>
    <div v-else-if="!order" class="text-center text-red-500 py-8">订单不存在</div>

    <template v-else>
      <!-- Order header -->
      <div class="card p-5">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-lg font-semibold text-gray-900">{{ order.title }}</h1>
            <p class="text-xs text-gray-400 mt-1 font-mono">{{ order.id }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span :class="orderStatusClass(order.status)" class="badge">{{ orderStatusLabel(order.status) }}</span>
            <button
              v-if="order.status === 'FAILED'"
              class="btn-primary text-xs"
              :disabled="isRetrying"
              @click="handleRetry"
            >
              {{ isRetrying ? '处理中...' : '重新生成' }}
            </button>
          </div>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-gray-500">套餐</dt>
            <dd class="text-gray-900">{{ order.productNameSnapshot }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">支付金额</dt>
            <dd class="text-gray-900">
              {{ order.paidAmountFen !== null ? `¥${(order.paidAmountFen / 100).toFixed(2)}` : '-' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">支付时间</dt>
            <dd class="text-gray-500 text-xs">{{ order.paidAt ? formatDate(order.paidAt) : '-' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">创建时间</dt>
            <dd class="text-gray-500 text-xs">{{ formatDate(order.createdAt) }}</dd>
          </div>
          <div v-if="order.latestFailureReason" class="col-span-2">
            <dt class="text-xs text-gray-500">最新失败原因</dt>
            <dd class="text-red-600 text-xs">{{ order.latestFailureReason }}</dd>
          </div>
        </dl>
      </div>

      <!-- Generation jobs -->
      <div class="card p-5 space-y-4">
        <h2 class="text-sm font-semibold text-gray-700">生成任务记录</h2>
        <div v-for="job in order.generationJobs" :key="job.id" class="border border-gray-100 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">尝试 #{{ job.attemptNo }}</span>
              <GenerationJobStatusBadge :status="job.status" :is-overdue="job.isOverdue" />
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="job.status === 'FAILED'"
                class="btn-secondary text-xs py-1"
                @click="handleJobRetry(job.id)"
              >重试任务</button>
              <button
                v-if="job.status === 'RUNNING' || job.status === 'QUEUED'"
                class="btn-danger text-xs py-1"
                @click="handleJobCancel(job.id)"
              >取消任务</button>
            </div>
          </div>

          <div v-if="selectedJobId === job.id && jobDetail">
            <GenerationJobLogPanel :event-logs="jobDetail.eventLogs" />
          </div>
          <button
            v-else
            class="text-xs text-primary-600 hover:text-primary-700"
            @click="loadJobDetail(job.id)"
          >查看日志</button>
        </div>
        <div v-if="order.generationJobs.length === 0" class="text-sm text-gray-400">暂无生成任务</div>
      </div>

      <!-- Order note -->
      <div class="card p-5">
        <OrderNoteEditor :order-id="order.id" :initial-note="order.note" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  fetchOrderDetail,
  retryOrderGeneration,
  fetchGenerationJobDetail,
  cancelGenerationJob,
  retryGenerationJob,
} from '@/services/orders/admin-orders.service'
import GenerationJobStatusBadge from '@/components/orders/GenerationJobStatusBadge.vue'
import GenerationJobLogPanel from '@/components/orders/GenerationJobLogPanel.vue'
import OrderNoteEditor from '@/components/orders/OrderNoteEditor.vue'
import type { AdminOrderDetailDto, GenerationJobDetailDto } from '@ai-paper/shared'
import { AdminOrderStatus } from '@ai-paper/shared'

const route = useRoute()
const orderId = route.params.orderId as string

const order = ref<AdminOrderDetailDto | null>(null)
const isLoading = ref(false)
const isRetrying = ref(false)
const selectedJobId = ref<string | null>(null)
const jobDetail = ref<GenerationJobDetailDto | null>(null)

function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_PAYMENT: '待支付', GENERATING: '生成中', COMPLETED: '已完成', FAILED: '已失败',
  }
  return map[status] ?? status
}

function orderStatusClass(status: string): string {
  if (status === 'FAILED') return 'badge-danger'
  if (status === 'COMPLETED') return 'badge-success'
  if (status === 'GENERATING') return 'badge-info'
  return 'badge-gray'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN')
}

async function loadOrder(): Promise<void> {
  isLoading.value = true
  try {
    order.value = await fetchOrderDetail(orderId)
  } finally {
    isLoading.value = false
  }
}

async function handleRetry(): Promise<void> {
  isRetrying.value = true
  try {
    await retryOrderGeneration(orderId)
    await loadOrder()
  } finally {
    isRetrying.value = false
  }
}

async function loadJobDetail(jobId: string): Promise<void> {
  selectedJobId.value = jobId
  jobDetail.value = await fetchGenerationJobDetail(jobId)
}

async function handleJobRetry(jobId: string): Promise<void> {
  await retryGenerationJob(jobId)
  await loadOrder()
}

async function handleJobCancel(jobId: string): Promise<void> {
  await cancelGenerationJob(jobId)
  await loadOrder()
}

onMounted(loadOrder)
</script>
