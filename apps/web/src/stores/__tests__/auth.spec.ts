import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import { http, setAuthToken } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: {
    post: vi.fn(),
    patch: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: {
      response: { use: vi.fn() },
    },
  },
  setAuthToken: vi.fn(),
}))

const mockHttp = vi.mocked(http)
const mockSetAuthToken = vi.mocked(setAuthToken)

const MOCK_USER = {
  userId: 'user-123',
  wechatOpenId: 'oABCD1234',
  nickname: '张三',
  avatarUrl: 'https://example.com/avatar.png',
  onboardingCompleted: false,
}

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.mock.token'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('初始状态', () => {
    it('token 和 user 初始为 null', () => {
      const store = useAuthStore()
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
    })

    it('isAuthenticated 初始为 false', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('needsOnboarding 在未登录时为 false', () => {
      const store = useAuthStore()
      expect(store.needsOnboarding).toBe(false)
    })
  })

  describe('loginWithWechat', () => {
    it('登录成功后存储 token 和 user', async () => {
      mockHttp.post = vi.fn().mockResolvedValue({
        data: { token: MOCK_TOKEN, user: MOCK_USER },
      })

      const store = useAuthStore()
      await store.loginWithWechat('wechat-code-abc')

      expect(mockHttp.post).toHaveBeenCalledWith('/auth/wechat', { code: 'wechat-code-abc' })
      expect(store.token).toBe(MOCK_TOKEN)
      expect(store.user).toEqual(MOCK_USER)
    })

    it('登录成功后调用 setAuthToken 设置 Authorization 头', async () => {
      mockHttp.post = vi.fn().mockResolvedValue({
        data: { token: MOCK_TOKEN, user: MOCK_USER },
      })

      const store = useAuthStore()
      await store.loginWithWechat('wechat-code-abc')

      expect(mockSetAuthToken).toHaveBeenCalledWith(MOCK_TOKEN)
    })

    it('登录成功后 isAuthenticated 为 true', async () => {
      mockHttp.post = vi.fn().mockResolvedValue({
        data: { token: MOCK_TOKEN, user: MOCK_USER },
      })

      const store = useAuthStore()
      await store.loginWithWechat('wechat-code-abc')

      expect(store.isAuthenticated).toBe(true)
    })

    it('登录后 onboardingCompleted=false 时 needsOnboarding 为 true', async () => {
      mockHttp.post = vi.fn().mockResolvedValue({
        data: { token: MOCK_TOKEN, user: { ...MOCK_USER, onboardingCompleted: false } },
      })

      const store = useAuthStore()
      await store.loginWithWechat('code')

      expect(store.needsOnboarding).toBe(true)
    })

    it('登录后 onboardingCompleted=true 时 needsOnboarding 为 false', async () => {
      mockHttp.post = vi.fn().mockResolvedValue({
        data: { token: MOCK_TOKEN, user: { ...MOCK_USER, onboardingCompleted: true } },
      })

      const store = useAuthStore()
      await store.loginWithWechat('code')

      expect(store.needsOnboarding).toBe(false)
    })

    it('登录失败时抛出错误', async () => {
      const error = new Error('Network Error')
      mockHttp.post = vi.fn().mockRejectedValue(error)

      const store = useAuthStore()
      await expect(store.loginWithWechat('bad-code')).rejects.toThrow('Network Error')
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('completeOnboarding', () => {
    it('调用 PATCH /users/me 并更新 user.onboardingCompleted', async () => {
      mockHttp.post = vi.fn().mockResolvedValue({
        data: { token: MOCK_TOKEN, user: { ...MOCK_USER, onboardingCompleted: false } },
      })
      mockHttp.patch = vi.fn().mockResolvedValue({ data: {} })

      const store = useAuthStore()
      await store.loginWithWechat('code')

      expect(store.user?.onboardingCompleted).toBe(false)

      await store.completeOnboarding()

      expect(mockHttp.patch).toHaveBeenCalledWith('/users/me', { onboardingCompleted: true })
      expect(store.user?.onboardingCompleted).toBe(true)
    })

    it('user 为 null 时不抛出错误', async () => {
      mockHttp.patch = vi.fn().mockResolvedValue({ data: {} })

      const store = useAuthStore()
      await expect(store.completeOnboarding()).resolves.toBeUndefined()
    })
  })

  describe('updateProfile', () => {
    it('调用 PATCH /users/me 并更新 user', async () => {
      const updatedUser = { ...MOCK_USER, nickname: '李四', avatarUrl: 'https://example.com/new.png' }
      mockHttp.patch = vi.fn().mockResolvedValue({ data: updatedUser })

      const store = useAuthStore()
      await store.updateProfile({ nickname: '李四', avatarUrl: 'https://example.com/new.png' })

      expect(mockHttp.patch).toHaveBeenCalledWith('/users/me', {
        nickname: '李四',
        avatarUrl: 'https://example.com/new.png',
      })
      expect(store.user).toEqual(updatedUser)
    })
  })

  describe('logout', () => {
    it('登出后清空 token 和 user', async () => {
      mockHttp.post = vi.fn().mockResolvedValue({
        data: { token: MOCK_TOKEN, user: MOCK_USER },
      })

      const store = useAuthStore()
      await store.loginWithWechat('code')
      expect(store.isAuthenticated).toBe(true)

      store.logout()

      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('登出后调用 setAuthToken(null)', async () => {
      mockHttp.post = vi.fn().mockResolvedValue({
        data: { token: MOCK_TOKEN, user: MOCK_USER },
      })

      const store = useAuthStore()
      await store.loginWithWechat('code')
      vi.clearAllMocks()

      store.logout()

      expect(mockSetAuthToken).toHaveBeenCalledWith(null)
    })
  })

  describe('restoreToken', () => {
    it('token 存在时恢复 Authorization 头', () => {
      const store = useAuthStore()
      store.token = MOCK_TOKEN

      store.restoreToken()

      expect(mockSetAuthToken).toHaveBeenCalledWith(MOCK_TOKEN)
    })

    it('token 为 null 时不调用 setAuthToken', () => {
      const store = useAuthStore()
      store.restoreToken()

      expect(mockSetAuthToken).not.toHaveBeenCalled()
    })
  })
})
