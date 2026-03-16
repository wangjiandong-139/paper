<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold text-gray-900">后台账号管理</h1>
      <button class="btn-primary text-xs" @click="showCreateModal = true">新建账号</button>
    </div>
    <div class="card overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-gray-400">加载中...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后登录</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="adminUsers.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400">暂无账号</td>
          </tr>
          <tr v-for="u in adminUsers" :key="u.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">{{ u.username }}</td>
            <td class="px-4 py-3">{{ roleLabel(u.role) }}</td>
            <td class="px-4 py-3">
              <span :class="u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'" class="badge">
                {{ u.status === 'ACTIVE' ? '正常' : u.status === 'LOCKED' ? '已锁定' : '已禁用' }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-gray-500">
              {{ u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN') : '从未登录' }}
            </td>
            <td class="px-4 py-3">
              <button class="text-xs text-primary-600 hover:underline" @click="editUser(u)">编辑</button>
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
import { AdminRole } from '@ai-paper/shared'
import type { AdminUserListItemDto } from '@ai-paper/shared'

const adminUsers = ref<AdminUserListItemDto[]>([])
const isLoading = ref(false)
const showCreateModal = ref(false)

const ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: '超级管理员',
  [AdminRole.OPERATOR]: '运营',
  [AdminRole.CUSTOMER_SERVICE]: '客服',
  [AdminRole.READ_ONLY]: '只读',
}

function roleLabel(role: AdminRole): string {
  return ROLE_LABELS[role] ?? role
}

async function loadUsers(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/admin-users')
    adminUsers.value = res.data.items ?? []
  } finally {
    isLoading.value = false
  }
}

function editUser(user: AdminUserListItemDto): void {
  console.log('Edit admin user', user.id)
}

onMounted(loadUsers)
</script>
