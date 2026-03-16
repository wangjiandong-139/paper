import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { http } from '@/lib/http'
import {
  RevisionType,
  COUNTED_REVISION_TYPES,
  BASIC_MAX_AI_REVISIONS,
} from '@/types/revision'
import type {
  CitationCheckResult,
  PlagiarismResult,
  DownloadFormat,
  DownloadResult,
  RevisionSaveRequest,
  PaperContent,
} from '@/types/revision'

// ─── 防抖工具 ──────────────────────────────────────────────────

export function createDebounce(fn: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(fn, delayMs)
  }
}

// ─── 常量 ──────────────────────────────────────────────────

export const AUTO_SAVE_DEBOUNCE_MS = 2000

// ─── 选项与返回类型 ──────────────────────────────────────────────────

export interface UseRevisionOptions {
  orderId: Ref<string | null>
  editor: Ref<Editor | null>
}

export interface UseRevisionReturn {
  // 论文内容
  paperHtml: Ref<string>
  aiRevisionCount: Ref<number>
  isLoadingContent: Ref<boolean>
  contentLoadError: Ref<string>

  // AI 改稿
  isRevising: Ref<boolean>
  revisionError: Ref<string>
  remainingRevisions: ReturnType<typeof computed<number>>
  canRevise: ReturnType<typeof computed<boolean>>

  // 引用核对
  citationCheckResult: Ref<CitationCheckResult | null>
  isCitationChecking: Ref<boolean>
  citationCheckError: Ref<string>
  hasCitationCheckResult: ReturnType<typeof computed<boolean>>

  // 查重
  plagiarismResult: Ref<PlagiarismResult | null>
  isPlagiarismChecking: Ref<boolean>
  plagiarismError: Ref<string>
  hasPlagiarismResult: ReturnType<typeof computed<boolean>>

  // 下载
  isDownloading: Ref<boolean>
  downloadError: Ref<string>

  // 自动保存
  isSaving: Ref<boolean>
  lastSavedAt: Ref<Date | null>

  // 方法
  loadContent: () => Promise<void>
  applyAiRevision: (type: RevisionType, instruction?: string) => Promise<void>
  runCitationCheck: () => Promise<void>
  runPlagiarismCheck: () => Promise<void>
  downloadPaper: (format: DownloadFormat) => Promise<void>
  saveContent: (content: string) => Promise<void>
  setupAutoSave: () => void
}

// ─── 组合式函数 ──────────────────────────────────────────────────

export function useRevision(options: UseRevisionOptions): UseRevisionReturn {
  const { orderId, editor } = options

  // ─── 论文内容状态 ──────────────────────────────────────────────────

  const paperHtml = ref('')
  const aiRevisionCount = ref(0)
  const isLoadingContent = ref(false)
  const contentLoadError = ref('')

  // ─── AI 改稿状态 ──────────────────────────────────────────────────

  const isRevising = ref(false)
  const revisionError = ref('')

  const remainingRevisions = computed(
    () => Math.max(0, BASIC_MAX_AI_REVISIONS - aiRevisionCount.value),
  )
  const canRevise = computed(() => remainingRevisions.value > 0 && !isRevising.value)

  // ─── 引用核对状态 ──────────────────────────────────────────────────

  const citationCheckResult = ref<CitationCheckResult | null>(null)
  const isCitationChecking = ref(false)
  const citationCheckError = ref('')
  const hasCitationCheckResult = computed(() => citationCheckResult.value !== null)

  // ─── 查重状态 ──────────────────────────────────────────────────

  const plagiarismResult = ref<PlagiarismResult | null>(null)
  const isPlagiarismChecking = ref(false)
  const plagiarismError = ref('')
  const hasPlagiarismResult = computed(() => plagiarismResult.value !== null)

  // ─── 下载状态 ──────────────────────────────────────────────────

  const isDownloading = ref(false)
  const downloadError = ref('')

  // ─── 自动保存状态 ──────────────────────────────────────────────────

  const isSaving = ref(false)
  const lastSavedAt = ref<Date | null>(null)

  // ─── 加载论文内容 ──────────────────────────────────────────────────

  async function loadContent(): Promise<void> {
    if (!orderId.value) return
    isLoadingContent.value = true
    contentLoadError.value = ''
    try {
      const { data } = await http.get<PaperContent>(`/orders/${orderId.value}/content`)
      paperHtml.value = data.html
      aiRevisionCount.value = data.aiRevisionCount
    } catch (err) {
      contentLoadError.value = err instanceof Error ? err.message : '加载论文内容失败'
    } finally {
      isLoadingContent.value = false
    }
  }

  // ─── AI 改稿（SSE 流式替换） ──────────────────────────────────────────────────

  async function applyAiRevision(type: RevisionType, instruction?: string): Promise<void> {
    if (!orderId.value || !editor.value) return
    if (!canRevise.value) return

    isRevising.value = true
    revisionError.value = ''

    const isCounted = COUNTED_REVISION_TYPES.includes(type)

    try {
      const selectedText = editor.value.state.selection.content().content.firstChild?.textContent ?? ''
      const authHeader =
        (http.defaults.headers.common['Authorization'] as string | undefined) ?? ''

      const response = await fetch(`/api/orders/${orderId.value}/revision/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ type, instruction, selectedText }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let replacementText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            // 流完成，将完整替换文本插入编辑器
            if (replacementText) {
              const { from, to } = editor.value.state.selection
              editor.value.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacementText).run()
            }
            if (isCounted) {
              aiRevisionCount.value++
            }
            return
          }
          try {
            const chunk = JSON.parse(payload) as { text?: string; done?: boolean }
            if (chunk.text) {
              replacementText += chunk.text
            }
            if (chunk.done) {
              if (replacementText) {
                const { from, to } = editor.value.state.selection
                editor.value.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacementText).run()
              }
              if (isCounted) {
                aiRevisionCount.value++
              }
              return
            }
          } catch {
            replacementText += payload
          }
        }
      }
    } catch (err) {
      revisionError.value = err instanceof Error ? err.message : 'AI 改稿失败，请重试'
    } finally {
      isRevising.value = false
    }
  }

  // ─── 引用核对 ──────────────────────────────────────────────────

  async function runCitationCheck(): Promise<void> {
    if (!orderId.value) return
    isCitationChecking.value = true
    citationCheckError.value = ''
    try {
      const { data } = await http.post<CitationCheckResult>(
        `/orders/${orderId.value}/citation-check`,
      )
      citationCheckResult.value = data
    } catch (err) {
      citationCheckError.value = err instanceof Error ? err.message : '引用核对失败，请重试'
    } finally {
      isCitationChecking.value = false
    }
  }

  // ─── 查重 ──────────────────────────────────────────────────

  async function runPlagiarismCheck(): Promise<void> {
    if (!orderId.value) return
    isPlagiarismChecking.value = true
    plagiarismError.value = ''
    try {
      const { data } = await http.post<PlagiarismResult>(
        `/orders/${orderId.value}/plagiarism-check`,
      )
      plagiarismResult.value = data
    } catch (err) {
      plagiarismError.value = err instanceof Error ? err.message : '查重失败，请重试'
    } finally {
      isPlagiarismChecking.value = false
    }
  }

  // ─── 下载（含守卫逻辑） ──────────────────────────────────────────────────

  async function downloadPaper(format: DownloadFormat): Promise<void> {
    if (!orderId.value) return

    // 下载前校验：必须已查看引用核对和查重结果
    if (!hasCitationCheckResult.value || !hasPlagiarismResult.value) {
      const missing: string[] = []
      if (!hasCitationCheckResult.value) missing.push('引用核对')
      if (!hasPlagiarismResult.value) missing.push('查重')
      downloadError.value = `请先完成以下操作再下载：${missing.join('、')}`
      return
    }

    isDownloading.value = true
    downloadError.value = ''
    try {
      const { data } = await http.post<DownloadResult>(`/orders/${orderId.value}/download`, {
        format,
      })
      // 触发浏览器下载
      const link = document.createElement('a')
      link.href = data.downloadUrl
      link.download = `论文.${format}`
      link.click()
    } catch (err) {
      downloadError.value = err instanceof Error ? err.message : '下载失败，请重试'
    } finally {
      isDownloading.value = false
    }
  }

  // ─── 保存改稿内容 ──────────────────────────────────────────────────

  async function saveContent(content: string): Promise<void> {
    if (!orderId.value) return
    isSaving.value = true
    try {
      const body: RevisionSaveRequest = { content }
      await http.patch(`/orders/${orderId.value}/revision`, body)
      lastSavedAt.value = new Date()
    } finally {
      isSaving.value = false
    }
  }

  // ─── 自动保存（防抖 2s） ──────────────────────────────────────────────────

  function setupAutoSave(): void {
    const debouncedSave = createDebounce(() => {
      if (editor.value) {
        const html = editor.value.getHTML()
        saveContent(html)
      }
    }, AUTO_SAVE_DEBOUNCE_MS)

    watch(
      () => editor.value?.getHTML(),
      () => {
        debouncedSave()
      },
    )
  }

  return {
    paperHtml,
    aiRevisionCount,
    isLoadingContent,
    contentLoadError,
    isRevising,
    revisionError,
    remainingRevisions,
    canRevise,
    citationCheckResult,
    isCitationChecking,
    citationCheckError,
    hasCitationCheckResult,
    plagiarismResult,
    isPlagiarismChecking,
    plagiarismError,
    hasPlagiarismResult,
    isDownloading,
    downloadError,
    isSaving,
    lastSavedAt,
    loadContent,
    applyAiRevision,
    runCitationCheck,
    runPlagiarismCheck,
    downloadPaper,
    saveContent,
    setupAutoSave,
  }
}
