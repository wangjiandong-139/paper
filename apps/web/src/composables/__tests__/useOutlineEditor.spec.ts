import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useOutlineEditor } from '../useOutlineEditor'
import type { OutlineNode } from '@/types/wizard'

vi.mock('@/lib/http', () => ({
  http: {
    defaults: { headers: { common: {} } },
  },
  setAuthToken: vi.fn(),
}))

function n(id: string, title: string, level: number, children: OutlineNode[] = []): OutlineNode {
  return { id, title, level, children, placeholders: [] }
}

function sampleOutline(): OutlineNode[] {
  return [
    n('c1', '第一章 绪论', 1, [n('c1-1', '1.1 背景', 2)]),
    n('c2', '第二章 文献综述', 1),
    n('c3', '第三章 结论', 1),
  ]
}

function createEditor(totalWords = 10000) {
  return useOutlineEditor({
    draftId: ref('draft-001'),
    totalWordCount: ref(totalWords),
  })
}

describe('useOutlineEditor', () => {
  describe('初始状态', () => {
    it('outline 初始为空', () => {
      const { outline } = createEditor()
      expect(outline.value).toHaveLength(0)
    })

    it('generationStatus 初始为 idle', () => {
      const { generationStatus } = createEditor()
      expect(generationStatus.value).toBe('idle')
    })

    it('showConfirmDialog 初始为 false', () => {
      const { showConfirmDialog } = createEditor()
      expect(showConfirmDialog.value).toBe(false)
    })
  })

  describe('setOutline', () => {
    it('直接设置提纲', () => {
      const { outline, setOutline } = createEditor()
      setOutline(sampleOutline())
      expect(outline.value).toHaveLength(3)
    })
  })

  describe('节点操作', () => {
    it('addChildNode 在根级添加新章节', () => {
      const { outline, setOutline, addChildNode } = createEditor()
      setOutline(sampleOutline())
      addChildNode(null, '第四章 附录')
      expect(outline.value).toHaveLength(4)
      expect(outline.value[3].title).toBe('第四章 附录')
      expect(outline.value[3].level).toBe(1)
    })

    it('addChildNode 在父节点下添加子节点', () => {
      const { outline, setOutline, addChildNode } = createEditor()
      setOutline(sampleOutline())
      addChildNode('c2', '2.1 新节')
      const c2 = outline.value.find((n) => n.id === 'c2')!
      expect(c2.children).toHaveLength(1)
      expect(c2.children[0].title).toBe('2.1 新节')
      expect(c2.children[0].level).toBe(2)
    })

    it('deleteNode 删除指定节点', () => {
      const { outline, setOutline, deleteNode } = createEditor()
      setOutline(sampleOutline())
      deleteNode('c2')
      expect(outline.value).toHaveLength(2)
      expect(outline.value.find((n) => n.id === 'c2')).toBeUndefined()
    })

    it('editNode 更新节点标题', () => {
      const { outline, setOutline, editNode } = createEditor()
      setOutline(sampleOutline())
      editNode('c1', '修改后的第一章')
      expect(outline.value[0].title).toBe('修改后的第一章')
    })

    it('editNode 更新节点字数', () => {
      const { outline, setOutline, editNode } = createEditor()
      setOutline(sampleOutline())
      editNode('c1', '第一章', 3000)
      expect(outline.value[0].word_count).toBe(3000)
    })
  })

  describe('移动节点', () => {
    it('moveUp 将节点上移', () => {
      const { outline, setOutline, moveUp } = createEditor()
      setOutline(sampleOutline())
      moveUp('c2')
      expect(outline.value[0].id).toBe('c2')
      expect(outline.value[1].id).toBe('c1')
    })

    it('moveDown 将节点下移', () => {
      const { outline, setOutline, moveDown } = createEditor()
      setOutline(sampleOutline())
      moveDown('c1')
      expect(outline.value[0].id).toBe('c2')
      expect(outline.value[1].id).toBe('c1')
    })
  })

  describe('占位符与字数统计', () => {
    it('placeholderCounts 初始全为 0', () => {
      const { placeholderCounts, setOutline } = createEditor()
      setOutline(sampleOutline())
      expect(placeholderCounts.value.total).toBe(0)
    })

    it('togglePlaceholder 添加占位标记', () => {
      const { setOutline, togglePlaceholder, placeholderCounts } = createEditor()
      setOutline(sampleOutline())
      togglePlaceholder('c1', 'figure')
      expect(placeholderCounts.value.figure).toBe(1)
      expect(placeholderCounts.value.total).toBe(1)
    })

    it('togglePlaceholder 再次调用移除占位标记', () => {
      const { setOutline, togglePlaceholder, placeholderCounts } = createEditor()
      setOutline(sampleOutline())
      togglePlaceholder('c1', 'figure')
      togglePlaceholder('c1', 'figure')
      expect(placeholderCounts.value.figure).toBe(0)
    })

    it('estimatedWords 计算正确', () => {
      const { setOutline, estimatedWords } = createEditor(10000)
      setOutline(sampleOutline())
      expect(estimatedWords.value).toBeGreaterThan(0)
      expect(estimatedWords.value).toBeLessThanOrEqual(10000)
    })
  })

  describe('确认弹窗', () => {
    it('openConfirmDialog 打开弹窗', () => {
      const { openConfirmDialog, showConfirmDialog } = createEditor()
      openConfirmDialog()
      expect(showConfirmDialog.value).toBe(true)
    })

    it('closeConfirmDialog 关闭弹窗', () => {
      const { openConfirmDialog, closeConfirmDialog, showConfirmDialog } = createEditor()
      openConfirmDialog()
      closeConfirmDialog()
      expect(showConfirmDialog.value).toBe(false)
    })
  })

  describe('重新生成确认', () => {
    it('cancelRegenerate 关闭重新生成确认弹窗', () => {
      const { showRegenerateConfirm, cancelRegenerate } = createEditor()
      showRegenerateConfirm.value = true
      cancelRegenerate()
      expect(showRegenerateConfirm.value).toBe(false)
    })
  })

  describe('generateOutline SSE', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('生成成功后设置 outline 并更新 status 为 done', async () => {
      const mockOutline = sampleOutline()
      const sseResponse = `data: ${JSON.stringify({ outline: mockOutline })}\n\n`

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => {
            let called = false
            return {
              read: async () => {
                if (!called) {
                  called = true
                  return {
                    done: false,
                    value: new TextEncoder().encode(sseResponse),
                  }
                }
                return { done: true, value: undefined }
              },
            }
          },
        },
      })

      const { generateOutline, outline, generationStatus } = createEditor()
      await generateOutline()

      expect(generationStatus.value).toBe('done')
      expect(outline.value).toHaveLength(3)
    })

    it('HTTP 错误时 generationStatus 为 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        body: null,
      })

      const { generateOutline, generationStatus } = createEditor()
      await expect(generateOutline()).rejects.toThrow()
      expect(generationStatus.value).toBe('error')
    })

    it('draftId 为 null 时不发请求', async () => {
      const fetchSpy = vi.fn()
      global.fetch = fetchSpy

      const { generateOutline } = useOutlineEditor({
        draftId: ref(null),
        totalWordCount: ref(10000),
      })
      await generateOutline()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('调用 generateOutline 后 generationStatus 立即变为 generating', () => {
      // generateOutline 同步设置 generationStatus = 'generating'（在第一个 await 之前）
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      })

      const { generateOutline, generationStatus } = createEditor()
      // 不 await，仅检查同步状态
      void generateOutline()
      expect(generationStatus.value).toBe('generating')
    })
  })
})
