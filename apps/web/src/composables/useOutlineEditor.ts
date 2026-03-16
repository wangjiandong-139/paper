import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { OutlineNode } from '@/types/wizard'
import {
  addNode,
  removeNode,
  updateNode,
  moveNodeUp,
  moveNodeDown,
  countPlaceholders,
  estimateWordCount,
  makeNode,
  findNode,
} from '@/utils/outline-utils'
import type { PlaceholderType } from '@/utils/outline-utils'
import { http } from '@/lib/http'

// ─── 生成状态 ──────────────────────────────────────────────────

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error'

export interface UseOutlineEditorOptions {
  draftId: Ref<string | null>
  totalWordCount: Ref<number>
}

export interface UseOutlineEditorReturn {
  outline: Ref<OutlineNode[]>
  generationStatus: Ref<GenerationStatus>
  generationText: Ref<string>
  showConfirmDialog: Ref<boolean>
  showRegenerateConfirm: Ref<boolean>
  editingNodeId: Ref<string | null>
  placeholderCounts: ReturnType<typeof computed>
  estimatedWords: ReturnType<typeof computed>
  generateOutline: () => Promise<void>
  confirmRegenerate: () => void
  cancelRegenerate: () => void
  addChildNode: (parentId: string | null, title: string) => void
  deleteNode: (id: string) => void
  editNode: (id: string, title: string, wordCount?: number) => void
  togglePlaceholder: (id: string, type: PlaceholderType) => void
  moveUp: (id: string) => void
  moveDown: (id: string) => void
  openConfirmDialog: () => void
  closeConfirmDialog: () => void
  setOutline: (nodes: OutlineNode[]) => void
}

// ─── 组合式函数 ──────────────────────────────────────────────────

export function useOutlineEditor(options: UseOutlineEditorOptions): UseOutlineEditorReturn {
  const { draftId, totalWordCount } = options

  const outline = ref<OutlineNode[]>([])
  const generationStatus = ref<GenerationStatus>('idle')
  const generationText = ref('')
  const showConfirmDialog = ref(false)
  const showRegenerateConfirm = ref(false)
  const editingNodeId = ref<string | null>(null)

  const placeholderCounts = computed(() => countPlaceholders(outline.value))
  const estimatedWords = computed(() =>
    estimateWordCount(outline.value, totalWordCount.value),
  )

  function setOutline(nodes: OutlineNode[]): void {
    outline.value = nodes
  }

  // ─── AI 生成（SSE） ──────────────────────────────────────────────────

  async function generateOutline(): Promise<void> {
    if (!draftId.value) return
    generationStatus.value = 'generating'
    generationText.value = ''
    outline.value = []

    try {
      // 尝试使用 fetch + ReadableStream 接收 SSE
      const response = await fetch(`/api/outlines/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: http.defaults.headers.common['Authorization'] as string ?? '',
        },
        body: JSON.stringify({ draft_id: draftId.value }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // 处理 SSE 事件（每行 "data: ..."）
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') {
              generationStatus.value = 'done'
              // 解析最终提纲 JSON
              try {
                const parsed = JSON.parse(generationText.value) as OutlineNode[]
                outline.value = parsed
              } catch {
                // generationText 可能是增量文本，忽略解析失败
              }
              return
            }
            try {
              const chunk = JSON.parse(payload) as { text?: string; outline?: OutlineNode[] }
              if (chunk.outline) {
                outline.value = chunk.outline
                generationStatus.value = 'done'
                return
              }
              if (chunk.text) {
                generationText.value += chunk.text
              }
            } catch {
              generationText.value += payload
            }
          }
        }
      }

      generationStatus.value = 'done'
    } catch (err) {
      generationStatus.value = 'error'
      throw err
    }
  }

  // ─── 重新生成 ──────────────────────────────────────────────────

  function confirmRegenerate(): void {
    showRegenerateConfirm.value = false
    void generateOutline()
  }

  function cancelRegenerate(): void {
    showRegenerateConfirm.value = false
  }

  // ─── 节点编辑 ──────────────────────────────────────────────────

  function addChildNode(parentId: string | null, title: string): void {
    const parentLevel = parentId
      ? (() => {
          let lvl = 1
          const walk = (nodes: OutlineNode[], id: string): boolean => {
            for (const n of nodes) {
              if (n.id === id) { lvl = n.level; return true }
              if (walk(n.children, id)) return true
            }
            return false
          }
          walk(outline.value, parentId)
          return lvl
        })()
      : 0
    const newLevel = parentId ? Math.min(parentLevel + 1, 3) : 1
    const newNode = makeNode(title, newLevel)
    outline.value = addNode(outline.value, parentId, newNode)
  }

  function deleteNode(id: string): void {
    outline.value = removeNode(outline.value, id)
  }

  function editNode(id: string, title: string, wordCount?: number): void {
    outline.value = updateNode(outline.value, id, {
      title,
      ...(wordCount !== undefined ? { word_count: wordCount } : {}),
    })
    editingNodeId.value = null
  }

  function togglePlaceholder(id: string, type: PlaceholderType): void {
    const found = findNode(outline.value, id)
    if (!found) return
    const current = found.node.placeholders ?? []
    const next = current.includes(type)
      ? current.filter((p) => p !== type)
      : [...current, type]
    outline.value = updateNode(outline.value, id, { placeholders: next as PlaceholderType[] })
  }

  function moveUp(id: string): void {
    outline.value = moveNodeUp(outline.value, id)
  }

  function moveDown(id: string): void {
    outline.value = moveNodeDown(outline.value, id)
  }

  function openConfirmDialog(): void {
    showConfirmDialog.value = true
  }

  function closeConfirmDialog(): void {
    showConfirmDialog.value = false
  }

  return {
    outline,
    generationStatus,
    generationText,
    showConfirmDialog,
    showRegenerateConfirm,
    editingNodeId,
    placeholderCounts,
    estimatedWords,
    generateOutline,
    confirmRegenerate,
    cancelRegenerate,
    addChildNode,
    deleteNode,
    editNode,
    togglePlaceholder,
    moveUp,
    moveDown,
    openConfirmDialog,
    closeConfirmDialog,
    setOutline,
  }
}
