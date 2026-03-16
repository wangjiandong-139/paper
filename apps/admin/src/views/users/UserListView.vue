<template>
  <div class="space-y-4">
    <h1 class="text-lg font-semibold text-gray-900">用户管理</h1>
    <div class="card p-4 flex items-end gap-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">搜索</label>
        <input v-model="search" type="text" class="input-field w-48 text-sm" placeholder="昵称/OpenID..." />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">状态</label>
        <select v-model="isDisabledFilter" class="input-field w-28 text-sm">
          <option value="">全部</option>
          <option value="false">正常</option>
          <option value="true">已禁用</option>
        </select>
      </div>
      <button class="btn-primary" @click="loadUsers">搜索</button>
    </div>
    <div class="card overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-gray-400">加载中...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">昵称</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单数</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日生成上限</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="users.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无用户</td>
          </tr>
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">{{ user.nickname ?? '未设置' }}</td>
            <td class="px-4 py-3">
              <span :class="user.isDisabled ? 'badge-danger' : 'badge-success'" class="badge">
                {{ user.isDisabled ? '已禁用' : '正常' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ user.orderCount }}</td>
            <td class="px-4 py-3 text-gray-600">{{ user.dailyGenerationLimit ?? '无限制' }}</td>
            <td class="px-4 py-3">
              <RouterLink :to="`/users/${user.id}`" class="text-xs text-primary-600 hover:underline">查看详情</RouterLink>
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
import type { AdminEndUserListItemDto } from '@ai-paper/shared'

const users = ref<AdminEndUserListItemDto[]>([])
const isLoading = ref(false)
const search = ref('')
const isDisabledFilter = ref('')

async function loadUsers(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/users', {
      params: {
        search: search.value || undefined,
        isDisabled: isDisabledFilter.value !== '' ? isDisabledFilter.value === 'true' : undefined,
      },
    })
    users.value = res.data.items ?? []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadUsers)
</script>
