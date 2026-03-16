import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWizardStore } from '../wizard'
import { http } from '@/lib/http'
import { Language, DegreeType } from '@/types/wizard'
import type { DraftDTO, Step1Data } from '@/types/wizard'

vi.mock('@/lib/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  },
  setAuthToken: vi.fn(),
}))

const mockHttp = vi.mocked(http)

function makeDraft(overrides: Partial<DraftDTO> = {}): DraftDTO {
  return {
    id: 'draft-001',
    currentStep: 1,
    step1Data: null,
    step2Data: null,
    step3Data: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const STEP1: Step1Data = {
  subject: '计算机科学与技术',
  title: '基于深度学习的图像识别研究',
  language: Language.ZH,
  degree_type: DegreeType.UNDERGRADUATE,
  word_count: 10000,
  template_id: 'default',
}

describe('useWizardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('drafts 初始为空数组', () => {
      const store = useWizardStore()
      expect(store.drafts).toEqual([])
    })

    it('currentDraftId 初始为 null', () => {
      const store = useWizardStore()
      expect(store.currentDraftId).toBeNull()
    })

    it('currentDraft 初始为 null', () => {
      const store = useWizardStore()
      expect(store.currentDraft).toBeNull()
    })
  })

  describe('loadDrafts', () => {
    it('调用 GET /drafts 并填充 drafts', async () => {
      const draft = makeDraft()
      mockHttp.get = vi.fn().mockResolvedValue({ data: [draft] })

      const store = useWizardStore()
      await store.loadDrafts()

      expect(mockHttp.get).toHaveBeenCalledWith('/drafts')
      expect(store.drafts).toEqual([draft])
    })

    it('加载期间 loading 为 true，完成后恢复 false', async () => {
      let resolveGet!: (v: unknown) => void
      mockHttp.get = vi.fn().mockImplementation(
        () => new Promise((resolve) => { resolveGet = resolve }),
      )

      const store = useWizardStore()
      const promise = store.loadDrafts()
      expect(store.loading).toBe(true)
      resolveGet({ data: [] })
      await promise
      expect(store.loading).toBe(false)
    })
  })

  describe('createDraft', () => {
    it('调用 POST /drafts 并追加到 drafts', async () => {
      const draft = makeDraft({ id: 'draft-new' })
      mockHttp.post = vi.fn().mockResolvedValue({ data: draft })

      const store = useWizardStore()
      const result = await store.createDraft()

      expect(mockHttp.post).toHaveBeenCalledWith('/drafts', {})
      expect(store.drafts).toContainEqual(draft)
      expect(store.currentDraftId).toBe('draft-new')
      expect(result).toEqual(draft)
    })
  })

  describe('selectDraft', () => {
    it('设置 currentDraftId 并使 currentDraft 指向正确草稿', () => {
      const store = useWizardStore()
      const draft = makeDraft({ id: 'draft-abc' })
      store.drafts.push(draft)
      store.selectDraft('draft-abc')
      expect(store.currentDraftId).toBe('draft-abc')
      expect(store.currentDraft).toEqual(draft)
    })
  })

  describe('saveStep1', () => {
    it('有当前草稿时调用 PATCH /drafts/:id/step/1 并更新缓存', async () => {
      const draft = makeDraft()
      mockHttp.patch = vi.fn().mockResolvedValue({ data: {} })

      const store = useWizardStore()
      store.drafts.push(draft)
      store.currentDraftId = 'draft-001'

      await store.saveStep1(STEP1)

      expect(mockHttp.patch).toHaveBeenCalledWith('/drafts/draft-001/step/1', STEP1)
      expect(store.drafts[0].step1Data).toEqual(STEP1)
    })

    it('无当前草稿时先创建再保存', async () => {
      const newDraft = makeDraft({ id: 'draft-brand-new' })
      mockHttp.get = vi.fn().mockResolvedValue({ data: [] })
      mockHttp.post = vi.fn().mockResolvedValue({ data: newDraft })
      mockHttp.patch = vi.fn().mockResolvedValue({ data: {} })

      const store = useWizardStore()
      await store.saveStep1(STEP1)

      expect(mockHttp.post).toHaveBeenCalledWith('/drafts', {})
      expect(mockHttp.patch).toHaveBeenCalledWith('/drafts/draft-brand-new/step/1', STEP1)
    })

    it('已有草稿时 ensureCurrentDraft 优先使用已有草稿', async () => {
      const existing = makeDraft({ id: 'draft-existing' })
      mockHttp.get = vi.fn().mockResolvedValue({ data: [existing] })
      mockHttp.patch = vi.fn().mockResolvedValue({ data: {} })

      const store = useWizardStore()
      // 没有 currentDraftId 但有草稿列表（需先 loadDrafts）
      await store.loadDrafts()
      store.currentDraftId = null  // 重置，模拟 ensureCurrentDraft 走 loadDrafts 分支

      // 重新设置 mock
      mockHttp.get = vi.fn().mockResolvedValue({ data: [existing] })
      await store.saveStep1(STEP1)

      expect(mockHttp.post).not.toHaveBeenCalled()
    })

    it('保存后 currentStep 至少为 1', async () => {
      const draft = makeDraft({ currentStep: 0 })
      mockHttp.patch = vi.fn().mockResolvedValue({ data: {} })

      const store = useWizardStore()
      store.drafts.push(draft)
      store.currentDraftId = 'draft-001'

      await store.saveStep1(STEP1)

      expect(store.drafts[0].currentStep).toBe(1)
    })
  })

  describe('deleteDraft', () => {
    it('调用 DELETE /drafts/:id 并从列表移除', async () => {
      const draft = makeDraft()
      mockHttp.delete = vi.fn().mockResolvedValue({ data: {} })

      const store = useWizardStore()
      store.drafts.push(draft)
      store.currentDraftId = 'draft-001'

      await store.deleteDraft('draft-001')

      expect(mockHttp.delete).toHaveBeenCalledWith('/drafts/draft-001')
      expect(store.drafts).toHaveLength(0)
      expect(store.currentDraftId).toBeNull()
    })

    it('删除非当前草稿时 currentDraftId 不变', async () => {
      const d1 = makeDraft({ id: 'draft-1' })
      const d2 = makeDraft({ id: 'draft-2' })
      mockHttp.delete = vi.fn().mockResolvedValue({ data: {} })

      const store = useWizardStore()
      store.drafts.push(d1, d2)
      store.currentDraftId = 'draft-1'

      await store.deleteDraft('draft-2')

      expect(store.currentDraftId).toBe('draft-1')
      expect(store.drafts).toHaveLength(1)
    })
  })

  describe('step1Data 计算属性', () => {
    it('当前草稿有 step1Data 时返回该数据', () => {
      const draft = makeDraft({ step1Data: STEP1 })
      const store = useWizardStore()
      store.drafts.push(draft)
      store.currentDraftId = 'draft-001'
      expect(store.step1Data).toEqual(STEP1)
    })

    it('无当前草稿时返回 null', () => {
      const store = useWizardStore()
      expect(store.step1Data).toBeNull()
    })
  })

  describe('reset', () => {
    it('重置后清空 drafts 和 currentDraftId', async () => {
      const draft = makeDraft()
      mockHttp.get = vi.fn().mockResolvedValue({ data: [draft] })

      const store = useWizardStore()
      await store.loadDrafts()
      store.currentDraftId = 'draft-001'

      store.reset()

      expect(store.drafts).toEqual([])
      expect(store.currentDraftId).toBeNull()
    })
  })
})
