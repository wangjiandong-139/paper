<template>
  <div class="space-y-4">
    <h1 class="text-lg font-semibold text-gray-900">模板需求申请</h1>
    <div class="card p-4">
      <p class="text-sm text-gray-500">用户提交的学校模板需求列表。处理后可关联到已创建的模板。</p>
    </div>
    <div class="card overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-gray-400">加载中...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学校</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学历</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">提交时间</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="requests.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无申请</td>
          </tr>
          <tr v-for="req in requests" :key="req.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">{{ req.schoolName }}</td>
            <td class="px-4 py-3">{{ req.degreeType }}</td>
            <td class="px-4 py-3">
              <span :class="requestStatusClass(req.status)" class="badge">{{ req.status }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-gray-500">{{ new Date(req.createdAt).toLocaleDateString('zh-CN') }}</td>
            <td class="px-4 py-3">
              <button
                v-if="req.status === 'PENDING'"
                class="text-xs text-primary-600 hover:underline"
                @click="fulfillRequest(req.id)"
              >处理</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import type { TemplateRequestListItemDto } from '@ai-paper/shared'

const requests = ref<TemplateRequestListItemDto[]>([])
const isLoading = ref(false)

function requestStatusClass(status: string): string {
  if (status === 'FULFILLED') return 'badge-success'
  if (status === 'IGNORED') return 'badge-gray'
  return 'badge-warning'
}

async function loadRequests(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/template-requests')
    requests.value = res.data.items ?? []
  } finally {
    isLoading.value = false
  }
}

async function fulfillRequest(id: string): Promise<void> {
  const templateId = prompt('请输入关联的模板ID:')
  if (!templateId) return
  await adminApi.post(`/template-requests/${id}/fulfill`, { templateId })
  await loadRequests()
}

onMounted(loadRequests)
</script>
