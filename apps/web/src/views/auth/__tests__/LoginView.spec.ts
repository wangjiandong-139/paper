import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LoginView from '../LoginView.vue'

const mockPush = vi.fn()
const mockRouteQuery = { redirect: '' }

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: mockRouteQuery }),
}))

const mockLoginWithWechat = vi.fn()
const mockAuthStore = {
  isAuthenticated: false,
  needsOnboarding: false,
  loginWithWechat: mockLoginWithWechat,
  token: null as string | null,
  user: null as unknown,
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('@/lib/http', () => ({
  http: {
    get: vi.fn().mockResolvedValue({ data: { url: 'https://qr.example.com/test.png' } }),
    defaults: { headers: { common: {} } },
  },
  setAuthToken: vi.fn(),
}))

vi.mock('vant', () => ({
  showToast: vi.fn(),
}))

const { showToast } = await import('vant')
const mockShowToast = vi.mocked(showToast)

function createWrapper(isMobileUA = false) {
  if (isMobileUA) {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true,
    })
  } else {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    })
  }

  return mount(LoginView, {
    global: {
      stubs: {
        'van-button': {
          template: '<button @click="$emit(\'click\')" :data-loading="loading"><slot /></button>',
          props: ['loading'],
        },
      },
    },
  })
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockLoginWithWechat.mockResolvedValue(undefined)
    mockPush.mockResolvedValue(undefined)
    mockAuthStore.isAuthenticated = false
    mockAuthStore.needsOnboarding = false
    mockAuthStore.token = null
    mockAuthStore.user = null
    mockRouteQuery.redirect = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('PC 端布局', () => {
    it('PC 端显示二维码容器', async () => {
      const wrapper = createWrapper(false)
      await flushPromises()
      expect(wrapper.find('[data-testid="qrcode-container"]').exists()).toBe(true)
    })

    it('PC 端不显示微信登录按钮', async () => {
      const wrapper = createWrapper(false)
      await flushPromises()
      expect(wrapper.find('[data-testid="wechat-login-btn"]').exists()).toBe(false)
    })
  })

  describe('移动端布局', () => {
    it('移动端显示微信登录按钮', async () => {
      const wrapper = createWrapper(true)
      await flushPromises()
      expect(wrapper.find('[data-testid="wechat-login-btn"]').exists()).toBe(true)
    })

    it('移动端不显示二维码容器', async () => {
      const wrapper = createWrapper(true)
      await flushPromises()
      expect(wrapper.find('[data-testid="qrcode-container"]').exists()).toBe(false)
    })

    it('URL 无 code 参数时提示用户通过微信打开', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '', href: 'http://localhost/login' },
        configurable: true,
      })
      const wrapper = createWrapper(true)
      await flushPromises()
      await wrapper.find('[data-testid="wechat-login-btn"]').trigger('click')
      await flushPromises()
      expect(mockShowToast).not.toHaveBeenCalled()
    })

    it('登录成功后跳转 /wizard/1（无 redirect query）', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?code=test-code-123', href: 'http://localhost/login?code=test-code-123' },
        configurable: true,
      })
      mockAuthStore.needsOnboarding = false
      const wrapper = createWrapper(true)
      await flushPromises()
      await wrapper.find('[data-testid="wechat-login-btn"]').trigger('click')
      await flushPromises()
      expect(mockLoginWithWechat).toHaveBeenCalledWith('test-code-123')
      expect(mockPush).toHaveBeenCalledWith('/wizard/1')
    })

    it('登录成功后跳转 redirect 指定路由', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?code=abc', href: 'http://localhost/login?code=abc' },
        configurable: true,
      })
      mockRouteQuery.redirect = '/orders'
      mockAuthStore.needsOnboarding = false
      const wrapper = createWrapper(true)
      await flushPromises()
      await wrapper.find('[data-testid="wechat-login-btn"]').trigger('click')
      await flushPromises()
      expect(mockPush).toHaveBeenCalledWith('/orders')
    })

    it('登录成功且 needsOnboarding 时跳转 /onboarding', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?code=abc', href: 'http://localhost/login?code=abc' },
        configurable: true,
      })
      mockAuthStore.needsOnboarding = true
      const wrapper = createWrapper(true)
      await flushPromises()
      await wrapper.find('[data-testid="wechat-login-btn"]').trigger('click')
      await flushPromises()
      expect(mockPush).toHaveBeenCalledWith('/onboarding')
    })

    it('登录失败时显示错误提示', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?code=bad', href: 'http://localhost/login?code=bad' },
        configurable: true,
      })
      mockLoginWithWechat.mockRejectedValue(new Error('Network Error'))
      const wrapper = createWrapper(true)
      await flushPromises()
      await wrapper.find('[data-testid="wechat-login-btn"]').trigger('click')
      await flushPromises()
      expect(mockShowToast).toHaveBeenCalledWith('登录失败，请重试')
    })
  })
})
