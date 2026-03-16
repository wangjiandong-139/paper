<template>
  <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
    <div class="flex items-center gap-2">
      <h2 class="text-sm font-medium text-gray-700">{{ pageTitle }}</h2>
    </div>
    <div class="flex items-center gap-4">
      <span class="text-sm text-gray-500">
        {{ currentUser?.username }}
        <span class="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{{ roleLabel }}</span>
      </span>
      <RouterLink to="/settings/change-password" class="text-xs text-gray-500 hover:text-gray-700">
        修改密码
      </RouterLink>
      <button
        class="text-xs text-red-500 hover:text-red-700 transition-colors"
        @click="handleLogout"
      >
        退出登录
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAdminAuthStore } from '@/stores/admin-auth.store'
import { AdminRole } from '@ai-paper/shared'

const authStore = useAdminAuthStore()
const route = useRoute()
const router = useRouter()

const currentUser = computed(() => authStore.currentUser)

const ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: '超级管理员',
  [AdminRole.OPERATOR]: '运营',
  [AdminRole.CUSTOMER_SERVICE]: '客服',
  [AdminRole.READ_ONLY]: '只读',
}

const roleLabel = computed(() =>
  currentUser.value ? ROLE_LABELS[currentUser.value.role] : '',
)

const pageTitle = computed(() => {
  const title = route.meta.title as string | undefined
  return title ?? ''
})

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.push('/login')
}
</script>
