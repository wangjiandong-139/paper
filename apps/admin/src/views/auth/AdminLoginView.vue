<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="w-full max-w-sm">
      <div class="card p-8 space-y-6">
        <div class="text-center">
          <h1 class="text-xl font-bold text-gray-900">AI论文写作</h1>
          <p class="text-sm text-gray-500 mt-1">运营管理后台</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              v-model="username"
              type="text"
              class="input-field"
              placeholder="请输入用户名"
              required
              autocomplete="username"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              v-model="password"
              type="password"
              class="input-field"
              placeholder="请输入密码"
              required
              autocomplete="current-password"
            />
          </div>

          <div v-if="loginError" class="text-sm text-red-600 bg-red-50 rounded-md p-2">
            {{ loginError }}
          </div>

          <button
            type="submit"
            class="btn-primary w-full justify-center"
            :disabled="isLoading"
          >
            {{ isLoading ? '登录中...' : '登录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuthStore } from '@/stores/admin-auth.store'
import { storeToRefs } from 'pinia'

const router = useRouter()
const route = useRoute()
const authStore = useAdminAuthStore()
const { isLoading, loginError } = storeToRefs(authStore)

const username = ref('')
const password = ref('')

async function handleLogin(): Promise<void> {
  try {
    await authStore.login({ username: username.value, password: password.value })
    const redirect = (route.query.redirect as string) ?? '/dashboard'
    router.push(redirect)
  } catch {
    // error is already set in the store
  }
}
</script>
