<template>
  <div class="min-h-screen bg-white flex flex-col">
    <div class="flex-1 flex flex-col items-center justify-center px-8">
      <div class="w-full max-w-sm text-center">
        <div class="text-6xl mb-6">{{ steps[current].icon }}</div>
        <h2 class="text-2xl font-bold mb-4 text-gray-800">{{ steps[current].title }}</h2>
        <p class="text-gray-500 text-base leading-relaxed">{{ steps[current].desc }}</p>
      </div>
    </div>

    <div class="pb-10 px-6">
      <div class="flex justify-center gap-2 mb-6">
        <span
          v-for="(_, i) in steps"
          :key="i"
          class="w-2 h-2 rounded-full transition-colors"
          :class="i === current ? 'bg-primary' : 'bg-gray-200'"
        />
      </div>

      <van-button
        v-if="current < steps.length - 1"
        type="primary"
        block
        @click="current++"
        class="!bg-primary !border-primary rounded-xl h-12 mb-3"
      >
        下一步
      </van-button>
      <van-button
        v-else
        type="primary"
        block
        :loading="loading"
        @click="handleComplete"
        class="!bg-primary !border-primary rounded-xl h-12 mb-3"
      >
        开始写论文
      </van-button>

      <van-button
        plain
        block
        @click="handleSkip"
        class="!border-gray-200 !text-gray-400 rounded-xl h-12"
      >
        跳过
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const current = ref(0)
const loading = ref(false)

const steps = [
  { icon: '📝', title: '填写论文信息', desc: '输入标题、学科、字数等基本信息，让 AI 了解你的需求' },
  { icon: '📚', title: '添加参考文献', desc: '粘贴知网引文或搜索推荐文献，AI 将基于真实文献生成内容' },
  { icon: '📋', title: 'AI 生成提纲', desc: 'AI 自动生成逻辑清晰的论文提纲，支持拖拽调整章节顺序' },
  { icon: '💳', title: '确认并支付', desc: '确认论文信息后完成支付，AI 开始生成完整论文' },
  { icon: '✅', title: '下载与改稿', desc: 'AI 生成完成后可手动编辑、AI 改稿、查重，最终下载 Word 文件' },
]

async function completeOnboarding(): Promise<void> {
  loading.value = true
  try {
    await authStore.completeOnboarding()
  } finally {
    loading.value = false
  }
}

async function handleComplete(): Promise<void> {
  await completeOnboarding()
  router.push('/wizard/1')
}

async function handleSkip(): Promise<void> {
  await completeOnboarding()
  router.push('/wizard/1')
}
</script>
