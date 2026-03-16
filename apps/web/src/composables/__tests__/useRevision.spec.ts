import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import {
  useRevision,
  createDebounce,
  AUTO_SAVE_DEBOUNCE_MS,
} from '@/composables/useRevision'
import { RevisionType, BASIC_MAX_AI_REVISIONS } from '@/types/revision'
import type { CitationCheckResult, PlagiarismResult, PaperContent } from '@/types/revision'
import type { Editor } from '@tiptap/vue-3'

// ─── mock ──────────────────────────────────────────────────

vi.mock('@/lib/http', () => ({
  http: {
    defaults: { headers: { common: {} } },
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.useFakeTimers()

// ─── helpers ──────────────────────────────────────────────────

function makeMockEditor(html = '<p>初始内容</p>'): Partial<Editor> {
  const content = { current: html }
  return {
    getHTML: () => content.current,
    commands: {
      setContent: vi.fn((newHtml: string) => {
        content.current = newHtml
        return true
      }),
    } as unknown as Editor['commands'],
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        deleteRange: vi.fn(() => ({
          insertContentAt: vi.fn(() => ({
            run: vi.fn(),
          })),
        })),
      })),
    })) as unknown as Editor['chain'],
    state: {
      selection: {
        content: () => ({
          content: {
            firstChild: { textContent: '选中的段落文本' },
          },
        }),
        from: 0,
        to: 10,
      },
    } as unknown as Editor['state'],
  }
}

function makeSseResponse(chunks: string[]): Response {
  const lines = chunks.map((c) => `data: ${c}\n\n`).join('')
  const encoder = new TextEncoder()
  let called = false
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (!called) {
            called = true
            return { done: false, value: encoder.encode(lines) }
          }
          return { done: true, value: undefined }
        },
      }),
    },
  } as unknown as Response
}

const mockCitationResult: CitationCheckResult = {
  traceable: [{ text: '引用1', reference: '[1]' }],
  untraceable: [{ text: '引用2', reference: '[2]' }],
  checkedAt: '2024-01-01T00:00:00.000Z',
}

const mockPlagiarismResult: PlagiarismResult = {
  overallRate: 15,
  reportUrl: 'https://report.example.com',
  provider: 'wanfang',
  checkedAt: '2024-01-01T00:00:00.000Z',
}

const mockPaperContent: PaperContent = {
  html: '<p>论文正文内容</p>',
  aiRevisionCount: 1,
}

function createRevision(mockEditor = makeMockEditor()) {
  const orderId = ref<string | null>('order-001')
  const editor = ref<Editor | null>(mockEditor as Editor)
  return {
    ...useRevision({ orderId, editor }),
    orderId,
    editor,
  }
}

// ─── 测试 ──────────────────────────────────────────────────

describe('useRevision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  // ─── 初始状态 ──────────────────────────────────────────────────

  describe('初始状态', () => {
    it('aiRevisionCount 初始为 0', () => {
      const { aiRevisionCount } = createRevision()
      expect(aiRevisionCount.value).toBe(0)
    })

    it('remainingRevisions 初始为 3', () => {
      const { remainingRevisions } = createRevision()
      expect(remainingRevisions.value).toBe(BASIC_MAX_AI_REVISIONS)
    })

    it('canRevise 初始为 true', () => {
      const { canRevise } = createRevision()
      expect(canRevise.value).toBe(true)
    })

    it('hasCitationCheckResult 初始为 false', () => {
      const { hasCitationCheckResult } = createRevision()
      expect(hasCitationCheckResult.value).toBe(false)
    })

    it('hasPlagiarismResult 初始为 false', () => {
      const { hasPlagiarismResult } = createRevision()
      expect(hasPlagiarismResult.value).toBe(false)
    })
  })

  // ─── loadContent ──────────────────────────────────────────────────

  describe('loadContent', () => {
    it('成功加载后更新 paperHtml 和 aiRevisionCount', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.get).mockResolvedValue({ data: mockPaperContent })

      const { loadContent, paperHtml, aiRevisionCount } = createRevision()
      await loadContent()

      expect(paperHtml.value).toBe('<p>论文正文内容</p>')
      expect(aiRevisionCount.value).toBe(1)
    })

    it('加载期间 isLoadingContent 为 true', async () => {
      const { http } = await import('@/lib/http')
      let resolveGet!: (v: unknown) => void
      vi.mocked(http.get).mockReturnValue(
        new Promise((resolve) => {
          resolveGet = resolve
        }),
      )

      const { loadContent, isLoadingContent } = createRevision()
      const promise = loadContent()
      expect(isLoadingContent.value).toBe(true)
      resolveGet({ data: mockPaperContent })
      await promise
      expect(isLoadingContent.value).toBe(false)
    })

    it('加载失败时设置 contentLoadError', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.get).mockRejectedValue(new Error('网络错误'))

      const { loadContent, contentLoadError } = createRevision()
      await loadContent()

      expect(contentLoadError.value).toContain('网络错误')
    })

    it('orderId 为 null 时不发请求', async () => {
      const { http } = await import('@/lib/http')
      const orderId = ref<string | null>(null)
      const editor = ref<Editor | null>(makeMockEditor() as Editor)
      const { loadContent } = useRevision({ orderId, editor })
      await loadContent()
      expect(http.get).not.toHaveBeenCalled()
    })
  })

  // ─── AI 改稿次数 ──────────────────────────────────────────────────

  describe('AI 改稿次数控制', () => {
    it('计入次数的改稿成功后 aiRevisionCount 增加 1', async () => {
      const chunks = [
        JSON.stringify({ text: '改写后的' }),
        JSON.stringify({ text: '内容' }),
        '[DONE]',
      ]
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse(chunks))

      const { applyAiRevision, aiRevisionCount } = createRevision()
      await applyAiRevision(RevisionType.REWRITE)

      expect(aiRevisionCount.value).toBe(1)
    })

    it('aiRevisionCount 达到 3 后 canRevise 为 false', () => {
      const { canRevise, aiRevisionCount } = createRevision()
      aiRevisionCount.value = BASIC_MAX_AI_REVISIONS
      expect(canRevise.value).toBe(false)
    })

    it('canRevise 为 false 时 applyAiRevision 不发请求', async () => {
      const fetchSpy = vi.fn()
      global.fetch = fetchSpy

      const { applyAiRevision, aiRevisionCount } = createRevision()
      aiRevisionCount.value = BASIC_MAX_AI_REVISIONS
      await applyAiRevision(RevisionType.REWRITE)

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('remainingRevisions 随 aiRevisionCount 正确减少', () => {
      const { remainingRevisions, aiRevisionCount } = createRevision()
      aiRevisionCount.value = 2
      expect(remainingRevisions.value).toBe(1)
    })

    it('aiRevisionCount 超过上限时 remainingRevisions 为 0（不为负）', () => {
      const { remainingRevisions, aiRevisionCount } = createRevision()
      aiRevisionCount.value = 5
      expect(remainingRevisions.value).toBe(0)
    })
  })

  // ─── AI 改稿 SSE ──────────────────────────────────────────────────

  describe('applyAiRevision SSE', () => {
    it('SSE 流处理成功，isRevising 回到 false', async () => {
      const chunks = [JSON.stringify({ text: '新内容' }), '[DONE]']
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse(chunks))

      const { applyAiRevision, isRevising } = createRevision()
      await applyAiRevision(RevisionType.POLISH)

      expect(isRevising.value).toBe(false)
    })

    it('HTTP 错误时 revisionError 有内容', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        body: null,
      } as unknown as Response)

      const { applyAiRevision, revisionError } = createRevision()
      await applyAiRevision(RevisionType.REWRITE)

      expect(revisionError.value).toBeTruthy()
    })

    it('网络错误时 revisionError 有内容', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fetch 失败'))

      const { applyAiRevision, revisionError } = createRevision()
      await applyAiRevision(RevisionType.REWRITE)

      expect(revisionError.value).toContain('fetch 失败')
    })

    it('SSE chunk.done=true 时结束改稿并更新次数', async () => {
      const chunks = [JSON.stringify({ text: '改写内容', done: true })]
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse(chunks))

      const { applyAiRevision, aiRevisionCount } = createRevision()
      await applyAiRevision(RevisionType.REWRITE)

      expect(aiRevisionCount.value).toBe(1)
    })
  })

  // ─── 引用核对 ──────────────────────────────────────────────────

  describe('runCitationCheck', () => {
    it('成功后设置 citationCheckResult', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post).mockResolvedValue({ data: mockCitationResult })

      const { runCitationCheck, citationCheckResult } = createRevision()
      await runCitationCheck()

      expect(citationCheckResult.value).toEqual(mockCitationResult)
    })

    it('成功后 hasCitationCheckResult 为 true', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post).mockResolvedValue({ data: mockCitationResult })

      const { runCitationCheck, hasCitationCheckResult } = createRevision()
      await runCitationCheck()

      expect(hasCitationCheckResult.value).toBe(true)
    })

    it('失败时设置 citationCheckError', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post).mockRejectedValue(new Error('引用核对服务不可用'))

      const { runCitationCheck, citationCheckError } = createRevision()
      await runCitationCheck()

      expect(citationCheckError.value).toContain('引用核对服务不可用')
    })
  })

  // ─── 查重 ──────────────────────────────────────────────────

  describe('runPlagiarismCheck', () => {
    it('成功后设置 plagiarismResult', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post).mockResolvedValue({ data: mockPlagiarismResult })

      const { runPlagiarismCheck, plagiarismResult } = createRevision()
      await runPlagiarismCheck()

      expect(plagiarismResult.value).toEqual(mockPlagiarismResult)
    })

    it('成功后 hasPlagiarismResult 为 true', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post).mockResolvedValue({ data: mockPlagiarismResult })

      const { runPlagiarismCheck, hasPlagiarismResult } = createRevision()
      await runPlagiarismCheck()

      expect(hasPlagiarismResult.value).toBe(true)
    })

    it('失败时设置 plagiarismError', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post).mockRejectedValue(new Error('查重服务不可用'))

      const { runPlagiarismCheck, plagiarismError } = createRevision()
      await runPlagiarismCheck()

      expect(plagiarismError.value).toContain('查重服务不可用')
    })
  })

  // ─── 下载守卫 ──────────────────────────────────────────────────

  describe('downloadPaper 下载守卫', () => {
    it('未完成引用核对和查重时 downloadError 提示两者', async () => {
      const { downloadPaper, downloadError } = createRevision()
      await downloadPaper('docx')

      expect(downloadError.value).toContain('引用核对')
      expect(downloadError.value).toContain('查重')
    })

    it('只完成引用核对时 downloadError 提示缺少查重', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post).mockResolvedValueOnce({ data: mockCitationResult })

      const { runCitationCheck, downloadPaper, downloadError } = createRevision()
      await runCitationCheck()
      await downloadPaper('docx')

      expect(downloadError.value).toContain('查重')
      expect(downloadError.value).not.toContain('引用核对')
    })

    it('只完成查重时 downloadError 提示缺少引用核对', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post).mockResolvedValueOnce({ data: mockPlagiarismResult })

      const { runPlagiarismCheck, downloadPaper, downloadError } = createRevision()
      await runPlagiarismCheck()
      await downloadPaper('docx')

      expect(downloadError.value).toContain('引用核对')
    })

    it('两者都完成后调用 http.post 下载', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post)
        .mockResolvedValueOnce({ data: mockCitationResult })
        .mockResolvedValueOnce({ data: mockPlagiarismResult })
        .mockResolvedValueOnce({ data: { downloadUrl: 'https://cdn.example.com/paper.docx' } })

      // Mock document.createElement
      const mockLink = { href: '', download: '', click: vi.fn() }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)

      const { runCitationCheck, runPlagiarismCheck, downloadPaper, downloadError } = createRevision()
      await runCitationCheck()
      await runPlagiarismCheck()
      await downloadPaper('docx')

      expect(downloadError.value).toBe('')
      expect(http.post).toHaveBeenCalledWith('/orders/order-001/download', { format: 'docx' })
    })

    it('下载 API 失败时设置 downloadError', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.post)
        .mockResolvedValueOnce({ data: mockCitationResult })
        .mockResolvedValueOnce({ data: mockPlagiarismResult })
        .mockRejectedValueOnce(new Error('生成文件失败'))

      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '', download: '', click: vi.fn(),
      } as unknown as HTMLElement)

      const { runCitationCheck, runPlagiarismCheck, downloadPaper, downloadError } = createRevision()
      await runCitationCheck()
      await runPlagiarismCheck()
      await downloadPaper('docx')

      expect(downloadError.value).toContain('生成文件失败')
    })
  })

  // ─── 自动保存防抖 ──────────────────────────────────────────────────

  describe('saveContent 与自动保存防抖', () => {
    it('saveContent 调用 http.patch 并更新 lastSavedAt', async () => {
      const { http } = await import('@/lib/http')
      vi.mocked(http.patch).mockResolvedValue({ data: {} })

      const { saveContent, lastSavedAt } = createRevision()
      await saveContent('<p>内容</p>')

      expect(http.patch).toHaveBeenCalledWith('/orders/order-001/revision', {
        content: '<p>内容</p>',
      })
      expect(lastSavedAt.value).toBeInstanceOf(Date)
    })

    it('saveContent 期间 isSaving 为 true', async () => {
      const { http } = await import('@/lib/http')
      let resolvePatch!: (v: unknown) => void
      vi.mocked(http.patch).mockReturnValue(
        new Promise((resolve) => {
          resolvePatch = resolve
        }),
      )

      const { saveContent, isSaving } = createRevision()
      const promise = saveContent('<p>内容</p>')
      expect(isSaving.value).toBe(true)
      resolvePatch({ data: {} })
      await promise
      expect(isSaving.value).toBe(false)
    })
  })

  // ─── createDebounce 纯函数 ──────────────────────────────────────────────────

  describe('createDebounce', () => {
    it('在延迟时间内多次调用只执行一次', () => {
      const fn = vi.fn()
      const debounced = createDebounce(fn, 500)

      debounced()
      debounced()
      debounced()

      expect(fn).not.toHaveBeenCalled()
      vi.advanceTimersByTime(500)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('间隔超过延迟时间后的调用会再次执行', () => {
      const fn = vi.fn()
      const debounced = createDebounce(fn, 500)

      debounced()
      vi.advanceTimersByTime(500)
      expect(fn).toHaveBeenCalledTimes(1)

      debounced()
      vi.advanceTimersByTime(500)
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it(`AUTO_SAVE_DEBOUNCE_MS 为 ${AUTO_SAVE_DEBOUNCE_MS}ms`, () => {
      expect(AUTO_SAVE_DEBOUNCE_MS).toBe(2000)
    })
  })
})
