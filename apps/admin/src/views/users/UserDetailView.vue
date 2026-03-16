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
        <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-xs text-gray-500">状态</dt>
            <dd>
              <span :class="user.isDisabled ? 'badge-danger' : 'badge-success'" class="badge">
                {{ user.isDisabled ? '已禁用' : '正常' }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500">订单数</dt>
            <dd class="text-gray-900">{{ user.orderCount }}</dd>
          </div>
        </dl>
      </div>
      <UserRiskControlForm :user-id="userId" :initial-config="user.riskControl" @updated="loadUser" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { adminApi } from '@/services/http/admin-api'
import UserRiskControlForm from '@/components/users/UserRiskControlForm.vue'
import type { AdminEndUserDetailDto } from '@ai-paper/shared'

const route = useRoute()
const userId = route.params.userId as string

const user = ref<AdminEndUserDetailDto | null>(null)
const isLoading = ref(false)

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
