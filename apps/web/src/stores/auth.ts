import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { http, setAuthToken } from '@/lib/http'

export interface UserInfo {
  userId: string
  wechatOpenId: string
  nickname: string | null
  avatarUrl: string | null
  onboardingCompleted: boolean
}

export interface WechatLoginResponseDTO {
  token: string
  user: UserInfo
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref<string | null>(null)
    const user = ref<UserInfo | null>(null)

    const isAuthenticated = computed(() => token.value !== null)
    const needsOnboarding = computed(
      () => isAuthenticated.value && user.value?.onboardingCompleted === false,
    )

    function _applyToken(t: string): void {
      token.value = t
      setAuthToken(t)
    }

    async function loginWithWechat(code: string): Promise<void> {
      const { data } = await http.post<WechatLoginResponseDTO>('/auth/wechat', { code })
      user.value = data.user
      _applyToken(data.token)
    }

    async function completeOnboarding(): Promise<void> {
      await http.patch('/users/me', { onboardingCompleted: true })
      if (user.value) {
        user.value = { ...user.value, onboardingCompleted: true }
      }
    }

    async function updateProfile(payload: Partial<Pick<UserInfo, 'nickname' | 'avatarUrl'>>): Promise<void> {
      const { data } = await http.patch<UserInfo>('/users/me', payload)
      user.value = data
    }

    function logout(): void {
      token.value = null
      user.value = null
      setAuthToken(null)
    }

    function restoreToken(): void {
      if (token.value) {
        setAuthToken(token.value)
      }
    }

    return {
      token,
      user,
      isAuthenticated,
      needsOnboarding,
      loginWithWechat,
      completeOnboarding,
      updateProfile,
      logout,
      restoreToken,
    }
  },
  {
    persist: {
      key: 'ai-paper-auth',
      pick: ['token', 'user'],
      afterHydrate(ctx) {
        ctx.store.restoreToken()
      },
    },
  },
)
