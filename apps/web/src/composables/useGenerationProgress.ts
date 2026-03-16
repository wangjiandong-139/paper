import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { http } from '@/lib/http'
import type { ProgressChapter, GenerationProgressEvent } from '@/types/order'

// ─── 生成状态类型 ──────────────────────────────────────────────────

export type GenerationProgressStatus =
  | 'idle'
  | 'connecting'
  | 'generating'
  | 'complete'
  | 'error'
  | 'reconnecting'

// ─── 重连配置 ──────────────────────────────────────────────────

export const RECONNECT_BASE_DELAY_MS = 1000
export const RECONNECT_MAX_DELAY_MS = 30000
export const RECONNECT_MAX_ATTEMPTS = 10

// ─── 选项与返回值类型 ──────────────────────────────────────────────────

export interface UseGenerationProgressOptions {
  orderId: Ref<string | null>
  onComplete?: (orderId: string) => void
  onError?: (error: string) => void
}

export interface UseGenerationProgressReturn {
  status: Ref<GenerationProgressStatus>
  progress: Ref<number>
  totalChapters: Ref<number>
  completedChapters: Ref<number>
  completedChapterList: Ref<ProgressChapter[]>
  currentChapterTitle: Ref<string>
  errorMessage: Ref<string>
  reconnectAttempts: Ref<number>
  isActive: ReturnType<typeof computed<boolean>>
  startListening: () => Promise<void>
  stopListening: () => void
  reset: () => void
}

// ─── 组合式函数 ──────────────────────────────────────────────────

export function useGenerationProgress(
  options: UseGenerationProgressOptions,
): UseGenerationProgressReturn {
  const { orderId, onComplete, onError } = options

  const status = ref<GenerationProgressStatus>('idle')
  const progress = ref(0)
  const totalChapters = ref(0)
  const completedChapters = ref(0)
  const completedChapterList = ref<ProgressChapter[]>([])
  const currentChapterTitle = ref('')
  const errorMessage = ref('')
  const reconnectAttempts = ref(0)

  const isActive = computed(
    () =>
      status.value === 'connecting' ||
      status.value === 'generating' ||
      status.value === 'reconnecting',
  )

  let abortController: AbortController | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function reset(): void {
    progress.value = 0
    totalChapters.value = 0
    completedChapters.value = 0
    completedChapterList.value = []
    currentChapterTitle.value = ''
    errorMessage.value = ''
    reconnectAttempts.value = 0
    status.value = 'idle'
  }

  function stopListening(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  function scheduleReconnect(): void {
    if (reconnectAttempts.value >= RECONNECT_MAX_ATTEMPTS) {
      status.value = 'error'
      errorMessage.value = `连接中断，已重试 ${RECONNECT_MAX_ATTEMPTS} 次，请刷新页面重试`
      onError?.(errorMessage.value)
      return
    }

    reconnectAttempts.value++
    status.value = 'reconnecting'

    // 指数退避，最大 30s
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts.value - 1),
      RECONNECT_MAX_DELAY_MS,
    )

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      startListening()
    }, delay)
  }

  function handleEvent(event: GenerationProgressEvent): void {
    totalChapters.value = event.totalChapters
    completedChapters.value = event.completedChapters
    progress.value = event.progress

    if (event.type === 'chapter_complete' && event.chapter) {
      currentChapterTitle.value = event.chapter.title
      // 避免重复添加（重连后可能收到已处理的事件）
      const alreadyAdded = completedChapterList.value.some(
        (c) => c.index === event.chapter!.index,
      )
      if (!alreadyAdded) {
        completedChapterList.value.push(event.chapter)
      }
      status.value = 'generating'
      // 重置重连计数（成功接收事件代表连接正常）
      reconnectAttempts.value = 0
    } else if (event.type === 'all_complete') {
      progress.value = 100
      status.value = 'complete'
      stopListening()
      if (orderId.value) {
        onComplete?.(orderId.value)
      }
    } else if (event.type === 'error') {
      status.value = 'error'
      errorMessage.value = event.error ?? '生成过程中出现错误'
      onError?.(errorMessage.value)
    }
  }

  async function startListening(): Promise<void> {
    if (!orderId.value) return

    stopListening()
    status.value = 'connecting'

    abortController = new AbortController()
    const signal = abortController.signal

    const authHeader =
      (http.defaults.headers.common['Authorization'] as string | undefined) ?? ''

    try {
      const response = await fetch(`/api/orders/${orderId.value}/progress`, {
        headers: {
          Accept: 'text/event-stream',
          Authorization: authHeader,
        },
        signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // 连接正常关闭且未完成 → 重连
          if (status.value !== 'complete' && status.value !== 'error') {
            scheduleReconnect()
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (!payload || payload === '[DONE]') continue
          try {
            const event = JSON.parse(payload) as GenerationProgressEvent
            handleEvent(event)
          } catch {
            // 忽略无法解析的行
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      if (status.value !== 'complete' && status.value !== 'error') {
        scheduleReconnect()
      }
    }
  }

  return {
    status,
    progress,
    totalChapters,
    completedChapters,
    completedChapterList,
    currentChapterTitle,
    errorMessage,
    reconnectAttempts,
    isActive,
    startListening,
    stopListening,
    reset,
  }
}
