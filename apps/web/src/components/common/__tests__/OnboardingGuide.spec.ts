import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import OnboardingGuide from '../OnboardingGuide.vue'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: {} }),
}))

const mockCompleteOnboarding = vi.fn()

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    completeOnboarding: mockCompleteOnboarding,
    isAuthenticated: true,
    needsOnboarding: true,
    token: 'mock-token',
    user: { userId: '1', onboardingCompleted: false },
  }),
}))

vi.mock('vant', () => ({
  showToast: vi.fn(),
}))

const vanButtonStub = {
  template: '<button @click.stop="$emit(\'click\')"><slot /></button>',
  emits: ['click'],
  props: ['type', 'block', 'plain', 'loading'],
}

function createWrapper() {
  return mount(OnboardingGuide, {
    global: {
      stubs: {
        'van-button': vanButtonStub,
      },
    },
  })
}

describe('OnboardingGuide', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockCompleteOnboarding.mockResolvedValue(undefined)
    mockPush.mockResolvedValue(undefined)
  })

  it('初始渲染第一步内容', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[data-testid="step-title"]').text()).toBe('填写论文信息')
    expect(wrapper.find('[data-testid="step-icon"]').text()).toBe('📝')
  })

  it('共渲染 5 个步骤指示点', () => {
    const wrapper = createWrapper()
    const dots = wrapper.find('[data-testid="step-dots"]').findAll('span')
    expect(dots).toHaveLength(5)
  })

  it('点击「下一步」进入第 2 步', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="next-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="step-title"]').text()).toBe('添加参考文献')
  })

  it('连续点击「下一步」可到达最后一步', async () => {
    const wrapper = createWrapper()
    for (let i = 0; i < 4; i++) {
      await wrapper.find('[data-testid="next-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
    }
    expect(wrapper.find('[data-testid="step-title"]').text()).toBe('下载与改稿')
    expect(wrapper.find('[data-testid="start-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="next-btn"]').exists()).toBe(false)
  })

  it('最后一步不显示「跳过」按钮', async () => {
    const wrapper = createWrapper()
    for (let i = 0; i < 4; i++) {
      await wrapper.find('[data-testid="next-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
    }
    expect(wrapper.find('[data-testid="skip-btn"]').exists()).toBe(false)
  })

  it('点击「跳过」调用 completeOnboarding 并跳转 /wizard/1', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="skip-btn"]').trigger('click')
    await flushPromises()
    expect(mockCompleteOnboarding).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith('/wizard/1')
  })

  it('点击「开始写论文」调用 completeOnboarding 并跳转 /wizard/1', async () => {
    const wrapper = createWrapper()
    for (let i = 0; i < 4; i++) {
      await wrapper.find('[data-testid="next-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
    }
    await wrapper.find('[data-testid="start-btn"]').trigger('click')
    await flushPromises()
    expect(mockCompleteOnboarding).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith('/wizard/1')
  })

  it('完成后触发 complete 事件', async () => {
    const wrapper = createWrapper()
    for (let i = 0; i < 4; i++) {
      await wrapper.find('[data-testid="next-btn"]').trigger('click')
      await wrapper.vm.$nextTick()
    }
    await wrapper.find('[data-testid="start-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })

  it('跳过后触发 skip 事件', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="skip-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('skip')).toHaveLength(1)
  })
})
