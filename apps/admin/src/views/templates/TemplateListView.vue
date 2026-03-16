<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold text-gray-900">学校格式模板</h1>
      <RouterLink to="/templates/new" class="btn-primary text-xs">新建模板</RouterLink>
    </div>

    <!-- Search -->
    <div class="card p-4 flex items-end gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">学校名称</label>
        <input v-model="searchText" type="text" class="input-field w-48 text-sm" placeholder="搜索学校..." />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">状态</label>
        <select v-model="statusFilter" class="input-field w-32 text-sm">
          <option value="">全部</option>
          <option value="ENABLED">已启用</option>
          <option value="DISABLED">已停用</option>
        </select>
      </div>
      <button class="btn-primary" @click="loadTemplates">搜索</button>
    </div>

    <div class="card overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-gray-400">加载中...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学校</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学历</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">引用格式</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="templates.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无模板</td>
          </tr>
          <tr v-for="tpl in templates" :key="tpl.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">{{ tpl.schoolName }}</td>
            <td class="px-4 py-3">{{ degreeLabel(tpl.degreeType) }}</td>
            <td class="px-4 py-3">{{ tpl.citationStyle }}</td>
            <td class="px-4 py-3">
              <span :class="tpl.status === 'ENABLED' ? 'badge-success' : 'badge-gray'" class="badge">
                {{ tpl.status === 'ENABLED' ? '启用' : '停用' }}
              </span>
            </td>
            <td class="px-4 py-3 flex items-center gap-2">
              <button class="text-xs text-primary-600 hover:underline" @click="editTemplate(tpl.id)">编辑</button>
              <button
                class="text-xs hover:underline"
                :class="tpl.status === 'ENABLED' ? 'text-red-500' : 'text-green-600'"
                @click="toggleStatus(tpl)"
              >
                {{ tpl.status === 'ENABLED' ? '停用' : '启用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { adminApi } from '@/services/http/admin-api'
import { DegreeType } from '@ai-paper/shared'
import type { AdminTemplateListItemDto } from '@ai-paper/shared'

const templates = ref<AdminTemplateListItemDto[]>([])
const isLoading = ref(false)
const searchText = ref('')
const statusFilter = ref('')

const DEGREE_LABELS: Record<DegreeType, string> = {
  [DegreeType.COLLEGE]: '大专',
  [DegreeType.BACHELOR]: '本科',
  [DegreeType.MASTER]: '硕士',
  [DegreeType.DOCTOR]: '博士',
}

function degreeLabel(degree: DegreeType): string {
  return DEGREE_LABELS[degree] ?? degree
}

async function loadTemplates(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/school-templates', {
      params: { search: searchText.value || undefined, status: statusFilter.value || undefined },
    })
    templates.value = res.data.items ?? []
  } finally {
    isLoading.value = false
  }
}

function editTemplate(id: string): void {
  console.log('Edit template', id)
}

async function toggleStatus(tpl: AdminTemplateListItemDto): Promise<void> {
  const action = tpl.status === 'ENABLED' ? 'disable' : 'enable'
  await adminApi.post(`/school-templates/${tpl.id}/${action}`)
  await loadTemplates()
}

onMounted(loadTemplates)
</script>
