import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import {
  useGenerationProgress,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_ATTEMPTS,
} from '@/composables/useGenerationProgress'
import type { GenerationProgressEvent } from '@/types/order'

// ─── mock ──────────────────────────────────────────────────

vi.mock('@/lib/http', () => ({
  http: {
    defaults: { headers: { common: {} } },
  },
}))

vi.useFakeTimers()

// ─── helpers ──────────────────────────────────────────────────

function makeSseResponse(events: GenerationProgressEvent[]): { ok: boolean; body: unknown } {
  const lines = events
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join('')
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
  }
}

function makeHangingResponse() {
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: () => new Promise(() => {}), // 永不 resolve
      }),
    },
  }
}

function makeChapterEvent(
  index: number,
  completedChapters: number,
  totalChapters = 5,
): GenerationProgressEvent {
  return {
    type: 'chapter_complete',
    orderId: 'order-001',
    chapter: { index, title: `第 ${index + 1} 章`, wordCount: 2000 },
    totalChapters,
    completedChapters,
    progress: Math.round((completedChapters / totalChapters) * 100),
  }
}

function makeAllCompleteEvent(): GenerationProgressEvent {
  return {
    type: 'all_complete',
    orderId: 'order-001',
    totalChapters: 5,
    completedChapters: 5,
    progress: 100,
  }
}

function makeErrorEvent(error: string): GenerationProgressEvent {
  return {
    type: 'error',
    orderId: 'order-001',
    totalChapters: 5,
    completedChapters: 2,
    progress: 40,
    error,
  }
}

function createProgress(onComplete = vi.fn(), onError = vi.fn()) {
  const orderId = ref<string | null>('order-001')
  return {
    ...useGenerationProgress({ orderId, onComplete, onError }),
    orderId,
  }
}

// ─── 测试 ──────────────────────────────────────────────────

describe('useGenerationProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  // ─── 初始状态 ──────────────────────────────────────────────────

  describe('初始状态', () => {
    it('status 为 idle', () => {
      const { status } = createProgress()
      expect(status.value).toBe('idle')
    })

    it('progress 为 0', () => {
      const { progress } = createProgress()
      expect(progress.value).toBe(0)
    })

    it('completedChapterList 为空', () => {
      const { completedChapterList } = createProgress()
      expect(completedChapterList.value).toHaveLength(0)
    })

    it('isActive 为 false', () => {
      const { isActive } = createProgress()
      expect(isActive.value).toBe(false)
    })
  })

  // ─── orderId 为 null ──────────────────────────────────────────────────

  it('orderId 为 null 时 startListening 不发请求', () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy
    const orderId = ref<string | null>(null)
    const { startListening } = useGenerationProgress({ orderId, onComplete: vi.fn() })
    startListening()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  // ─── chapter_complete 事件 ──────────────────────────────────────────────────

  describe('chapter_complete 事件处理', () => {
    it('接收到 chapter_complete 后更新 completedChapters 与 progress', async () => {
      const event = makeChapterEvent(0, 1)
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([event]))

      const { startListening, completedChapters, progress } = createProgress()
      await startListening()

      expect(completedChapters.value).toBe(1)
      expect(progress.value).toBe(20)
    })

    it('接收到 chapter_complete 后添加章节到 completedChapterList', async () => {
      const event = makeChapterEvent(0, 1)
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([event]))

      const { startListening, completedChapterList } = createProgress()
      await startListening()

      expect(completedChapterList.value).toHaveLength(1)
      expect(completedChapterList.value[0].title).toBe('第 1 章')
    })

    it('status 在收到 chapter_complete 且流关闭后变为 reconnecting（等待更多章节）', async () => {
      // 流只发送一个 chapter_complete 就关闭（未收到 all_complete），因此触发重连
      const event = makeChapterEvent(0, 1)
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([event]))

      const { startListening, status } = createProgress()
      await startListening()

      // 流已关闭但未完成 → 重连
      expect(status.value).toBe('reconnecting')
      // 但章节列表已正确更新
    })

    it('重复章节（相同 index）不会被重复添加', async () => {
      const event1 = makeChapterEvent(0, 1)
      const event2 = makeChapterEvent(0, 1) // 重复的章节
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([event1, event2]))

      const { startListening, completedChapterList } = createProgress()
      await startListening()

      expect(completedChapterList.value).toHaveLength(1)
    })

    it('currentChapterTitle 更新为最新生成的章节标题', async () => {
      const event = makeChapterEvent(0, 1)
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([event]))

      const { startListening, currentChapterTitle } = createProgress()
      await startListening()

      expect(currentChapterTitle.value).toBe('第 1 章')
    })
  })

  // ─── all_complete 事件 ──────────────────────────────────────────────────

  describe('all_complete 事件处理', () => {
    it('接收到 all_complete 后 status 变为 complete', async () => {
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([makeAllCompleteEvent()]))

      const { startListening, status } = createProgress()
      await startListening()

      expect(status.value).toBe('complete')
    })

    it('接收到 all_complete 后 progress 变为 100', async () => {
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([makeAllCompleteEvent()]))

      const { startListening, progress } = createProgress()
      await startListening()

      expect(progress.value).toBe(100)
    })

    it('接收到 all_complete 后调用 onComplete 回调', async () => {
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([makeAllCompleteEvent()]))

      const onComplete = vi.fn()
      const { startListening } = createProgress(onComplete)
      await startListening()

      expect(onComplete).toHaveBeenCalledWith('order-001')
    })
  })

  // ─── error 事件 ──────────────────────────────────────────────────

  describe('error 事件处理', () => {
    it('接收到 error 事件后 status 变为 error', async () => {
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([makeErrorEvent('AI 生成失败')]))

      const { startListening, status } = createProgress()
      await startListening()

      expect(status.value).toBe('error')
    })

    it('接收到 error 事件后 errorMessage 有内容', async () => {
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([makeErrorEvent('AI 生成失败')]))

      const { startListening, errorMessage } = createProgress()
      await startListening()

      expect(errorMessage.value).toBe('AI 生成失败')
    })

    it('接收到 error 事件后调用 onError 回调', async () => {
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([makeErrorEvent('AI 生成失败')]))

      const onError = vi.fn()
      const { startListening } = createProgress(vi.fn(), onError)
      await startListening()

      expect(onError).toHaveBeenCalledWith('AI 生成失败')
    })
  })

  // ─── 自动重连 ──────────────────────────────────────────────────

  describe('自动重连', () => {
    it('fetch 抛出异常后 status 变为 reconnecting', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('网络错误'))

      const { startListening, status } = createProgress()
      await startListening()

      expect(status.value).toBe('reconnecting')
    })

    it('流正常关闭（未完成）后触发重连', async () => {
      // 立即返回 done:true（流关闭但没收到 all_complete）
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
          }),
        },
      })

      const { startListening, status } = createProgress()
      await startListening()

      expect(status.value).toBe('reconnecting')
    })

    it('重连后 reconnectAttempts 增加', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('网络错误'))

      const { startListening, reconnectAttempts } = createProgress()
      await startListening()

      expect(reconnectAttempts.value).toBe(1)
    })

    it('第一次重连使用基础延迟', async () => {
      let fetchCallCount = 0
      global.fetch = vi.fn().mockImplementation(async () => {
        fetchCallCount++
        if (fetchCallCount === 1) {
          throw new Error('网络错误')
        }
        return makeHangingResponse()
      })

      const { startListening } = createProgress()
      await startListening()

      expect(fetchCallCount).toBe(1)

      // 触发重连定时器
      await vi.advanceTimersByTimeAsync(RECONNECT_BASE_DELAY_MS)
      expect(fetchCallCount).toBe(2)
    })

    it('达到最大重连次数后 status 变为 error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('持续错误'))

      const { startListening, status } = createProgress()
      await startListening()

      // 模拟触发所有重连
      for (let i = 0; i < RECONNECT_MAX_ATTEMPTS; i++) {
        await vi.runAllTimersAsync()
      }

      expect(status.value).toBe('error')
    })

    it('达到最大重连次数后调用 onError', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('持续错误'))

      const onError = vi.fn()
      const { startListening } = createProgress(vi.fn(), onError)
      await startListening()

      for (let i = 0; i < RECONNECT_MAX_ATTEMPTS; i++) {
        await vi.runAllTimersAsync()
      }

      expect(onError).toHaveBeenCalled()
    })
  })

  // ─── stopListening ──────────────────────────────────────────────────

  describe('stopListening', () => {
    it('stopListening 后不会触发重连定时器', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('网络错误'))

      const { startListening, stopListening, status } = createProgress()
      await startListening()
      expect(status.value).toBe('reconnecting')

      stopListening()
      await vi.advanceTimersByTimeAsync(RECONNECT_BASE_DELAY_MS * 10)

      // fetch 只调用了一次（初始），没有重连
      expect(vi.mocked(global.fetch).mock.calls.length).toBe(1)
    })
  })

  // ─── reset ──────────────────────────────────────────────────

  describe('reset', () => {
    it('reset 清空所有状态', async () => {
      const event = makeChapterEvent(0, 1)
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([event]))

      const { startListening, reset, progress, completedChapterList, status } = createProgress()
      await startListening()

      expect(completedChapterList.value.length).toBeGreaterThan(0)

      reset()

      expect(status.value).toBe('idle')
      expect(progress.value).toBe(0)
      expect(completedChapterList.value).toHaveLength(0)
    })
  })

  // ─── isActive ──────────────────────────────────────────────────

  describe('isActive', () => {
    it('connecting 时 isActive 为 true', () => {
      global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

      const { startListening, isActive } = createProgress()
      startListening()

      expect(isActive.value).toBe(true)
    })

    it('complete 时 isActive 为 false', async () => {
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([makeAllCompleteEvent()]))

      const { startListening, isActive } = createProgress()
      await startListening()

      expect(isActive.value).toBe(false)
    })

    it('error 时 isActive 为 false', async () => {
      global.fetch = vi.fn().mockResolvedValue(makeSseResponse([makeErrorEvent('失败')]))

      const { startListening, isActive } = createProgress()
      await startListening()

      expect(isActive.value).toBe(false)
    })
  })

  // ─── HTTP 错误 ──────────────────────────────────────────────────

  it('HTTP 400+ 响应触发重连', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, body: null })

    const { startListening, status } = createProgress()
    await startListening()

    expect(status.value).toBe('reconnecting')
  })
})
