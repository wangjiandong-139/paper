import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import type { AdminUserProfileDto, AdminLoginDto } from '@ai-paper/shared'

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const currentUser = ref<AdminUserProfileDto | null>(null)
  const isLoading = ref(false)
  const loginError = ref<string | null>(null)

  const isAuthenticated = computed(() => currentUser.value !== null)
  const role = computed(() => currentUser.value?.role ?? null)

  async function login(credentials: AdminLoginDto): Promise<void> {
    isLoading.value = true
    loginError.value = null
    try {
      const response = await adminApi.post<{ adminUser: AdminUserProfileDto }>(
        '/auth/login',
        credentials,
      )
      currentUser.value = response.data.adminUser
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      loginError.value = axiosErr.response?.data?.message ?? 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await adminApi.post('/auth/logout')
    } finally {
      currentUser.value = null
    }
  }

  async function fetchCurrentUser(): Promise<void> {
    try {
      const response = await adminApi.get<{ adminUser: AdminUserProfileDto }>('/auth/me')
      currentUser.value = response.data.adminUser
    } catch {
      currentUser.value = null
    }
  }

  function clearSession(): void {
    currentUser.value = null
  }

  return {
    currentUser,
    isLoading,
    loginError,
    isAuthenticated,
    role,
    login,
    logout,
    fetchCurrentUser,
    clearSession,
  }
})
