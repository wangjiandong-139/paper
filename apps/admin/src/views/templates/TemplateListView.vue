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

    <div v-if="isLoading" class="card p-8 text-center text-gray-400">加载中...</div>
    <div v-else-if="groupedTemplates.length === 0" class="card p-8 text-center text-gray-400">暂无模板</div>

    <!-- Grouped by school -->
    <div v-for="group in groupedTemplates" :key="group.schoolName" class="card overflow-hidden">
      <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-800">{{ group.schoolName }}</span>
        <span class="text-xs text-gray-400">{{ group.templates.length }} 个学历</span>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">学历</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">引用格式</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">状态</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="tpl in group.templates" :key="tpl.id" class="hover:bg-gray-50">
            <td class="px-4 py-2.5">{{ degreeLabel(tpl.degreeType) }}</td>
            <td class="px-4 py-2.5 text-gray-600">{{ tpl.citationStyle }}</td>
            <td class="px-4 py-2.5">
              <span :class="tpl.status === 'ENABLED' ? 'badge-success' : 'badge-gray'" class="badge">
                {{ tpl.status === 'ENABLED' ? '启用' : '停用' }}
              </span>
            </td>
            <td class="px-4 py-2.5 flex items-center gap-2">
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
import { ref, computed, onMounted } from 'vue'
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

const groupedTemplates = computed(() => {
  const map = new Map<string, AdminTemplateListItemDto[]>()
  for (const tpl of templates.value) {
    if (!map.has(tpl.schoolName)) map.set(tpl.schoolName, [])
    map.get(tpl.schoolName)!.push(tpl)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'zh'))
    .map(([schoolName, tpls]) => ({ schoolName, templates: tpls }))
})

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
