<template>
  <div class="space-y-4">
    <h1 class="text-lg font-semibold text-gray-900">操作日志</h1>

    <div class="card p-4 flex flex-wrap items-end gap-3">
      <OperationLogFilters v-model="filters" @search="loadLogs" />
    </div>

    <div class="card overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-gray-400">加载中...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作人</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作类型</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对象</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">摘要</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="logs.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无日志</td>
          </tr>
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-700">{{ log.actorUsername }}</td>
            <td class="px-4 py-3"><span class="badge badge-gray">{{ log.actionType }}</span></td>
            <td class="px-4 py-3 text-xs text-gray-500">{{ log.targetType }}: {{ log.targetId.slice(0, 8) }}...</td>
            <td class="px-4 py-3 text-gray-600">{{ log.summary }}</td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ new Date(log.createdAt).toLocaleString('zh-CN') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import OperationLogFilters from '@/components/logs/OperationLogFilters.vue'
import type { OperationLogListItemDto, OperationLogListQueryDto } from '@ai-paper/shared'

const logs = ref<OperationLogListItemDto[]>([])
const isLoading = ref(false)
const filters = ref<OperationLogListQueryDto>({})

async function loadLogs(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/operation-logs', { params: filters.value })
    logs.value = res.data.items ?? []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadLogs)
</script>
