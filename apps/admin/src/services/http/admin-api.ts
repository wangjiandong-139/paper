import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { useAdminAuthStore } from '@/stores/admin-auth.store'

export const adminApi: AxiosInstance = axios.create({
  baseURL: '/api/admin',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

adminApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const authStore = useAdminAuthStore()
      authStore.clearSession()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
