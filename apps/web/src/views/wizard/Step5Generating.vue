<template>
  <div class="step5-generating min-h-screen flex flex-col">
    <!-- 生成完成动画 -->
    <transition name="fade">
      <div
        v-if="status === 'complete'"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
        data-testid="complete-overlay"
      >
        <div class="text-center animate-bounce-in">
          <van-icon name="checked" color="#07c160" size="72" />
          <p class="text-xl font-bold text-green-600 mt-4">论文生成完成！</p>
          <p class="text-sm text-gray-500 mt-2">正在跳转到编辑页面…</p>
        </div>
      </div>
    </transition>

    <!-- 主体内容 -->
    <div class="flex-1 p-4 pb-8">
      <!-- 标题 -->
      <div class="text-center mb-6 mt-4">
        <p class="text-lg font-bold text-gray-800">AI 正在生成您的论文</p>
        <p class="text-sm text-gray-500 mt-1">请耐心等待，生成过程约需 3～8 分钟</p>
      </div>

      <!-- 总进度条 -->
      <div class="mb-6">
        <div class="flex justify-between text-sm text-gray-500 mb-1">
          <span>整体进度</span>
          <span>{{ completedChapters }}/{{ totalChapters }} 章</span>
        </div>
        <van-progress
          :percentage="progress"
          stroke-width="12"
          color="#07c160"
          :show-pivot="true"
          data-testid="progress-bar"
        />
      </div>

      <!-- 正在生成的章节 -->
      <div v-if="currentChapterTitle && status === 'generating'" class="mb-4">
        <van-cell-group inset>
          <van-cell>
            <template #title>
              <div class="flex items-center gap-2">
                <van-loading size="16" color="#07c160" />
                <span class="text-sm text-gray-700">正在生成：{{ currentChapterTitle }}</span>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 重连提示 -->
      <div v-if="status === 'reconnecting'" class="mb-4">
        <van-notice-bar
          :text="`网络连接中断，正在重新连接… (第 ${reconnectAttempts} 次重试)`"
          color="#ed6a0c"
          background="#fffbe8"
          left-icon="warning-o"
          data-testid="reconnecting-notice"
        />
      </div>

      <!-- 错误提示 -->
      <div v-if="status === 'error'" class="mb-4" data-testid="error-state">
        <van-notice-bar
          :text="errorMessage || '生成过程出现错误，请重试'"
          color="#ed6a0c"
          background="#fffbe8"
          left-icon="warning-o"
        />
        <div class="mt-3">
          <van-button round block type="primary" color="#07c160" @click="handleRetry">
            重新连接
          </van-button>
        </div>
      </div>

      <!-- 已完成章节列表 -->
      <div v-if="completedChapterList.length > 0" class="mt-4">
        <p class="text-sm font-semibold text-gray-700 mb-2">已完成章节</p>
        <van-cell-group inset>
          <van-cell
            v-for="chapter in completedChapterList"
            :key="chapter.index"
            :title="`第 ${chapter.index + 1} 章：${chapter.title}`"
            :label="`约 ${chapter.wordCount.toLocaleString()} 字`"
            data-testid="chapter-item"
          >
            <template #right-icon>
              <van-icon name="checked" color="#07c160" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 连接中骨架屏 -->
      <div v-if="status === 'connecting'" class="mt-4" data-testid="connecting-skeleton">
        <van-skeleton :row="4" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGenerationProgress } from '@/composables/useGenerationProgress'

const router = useRouter()
const route = useRoute()

const orderIdFromRoute = computed(() => {
  const id = route.query.orderId
  return typeof id === 'string' ? id : null
})

const orderId = ref(orderIdFromRoute.value)

const {
  status,
  progress,
  totalChapters,
  completedChapters,
  completedChapterList,
  currentChapterTitle,
  errorMessage,
  reconnectAttempts,
  startListening,
  stopListening,
  reset,
} = useGenerationProgress({
  orderId,
  onComplete(oid) {
    // 延迟 1.5s 展示完成动画后跳转
    setTimeout(() => {
      router.push({ path: '/wizard/6', query: { orderId: oid } })
    }, 1500)
  },
})

function handleRetry(): void {
  reset()
  startListening()
}

onMounted(() => {
  if (orderId.value) {
    startListening()
  }
})

onUnmounted(() => {
  stopListening()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes bounceIn {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-bounce-in {
  animation: bounceIn 0.5s ease forwards;
}
</style>
