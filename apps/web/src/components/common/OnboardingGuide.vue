<template>
  <div class="min-h-screen bg-white flex flex-col">
    <div class="flex-1 flex flex-col items-center justify-center px-8">
      <div class="w-full max-w-sm text-center">
        <div class="text-6xl mb-6" data-testid="step-icon">{{ steps[current].icon }}</div>
        <h2 class="text-2xl font-bold mb-4 text-gray-800" data-testid="step-title">
          {{ steps[current].title }}
        </h2>
        <p class="text-gray-500 text-base leading-relaxed" data-testid="step-desc">
          {{ steps[current].desc }}
        </p>
      </div>
    </div>

    <div class="pb-10 px-6">
      <!-- 步骤指示点 -->
      <div class="flex justify-center gap-2 mb-6" data-testid="step-dots">
        <span
          v-for="(_, i) in steps"
          :key="i"
          class="w-2 h-2 rounded-full transition-colors duration-200"
          :class="i === current ? 'bg-[#07c160]' : 'bg-gray-200'"
        />
      </div>

      <!-- 下一步 / 开始写论文 -->
      <van-button
        v-if="current < steps.length - 1"
        type="primary"
        block
        data-testid="next-btn"
        @click="handleNext"
        class="!bg-[#07c160] !border-[#07c160] rounded-xl h-12 mb-3"
      >
        下一步
      </van-button>
      <van-button
        v-else
        type="primary"
        block
        :loading="loading"
        data-testid="start-btn"
        @click="handleComplete"
        class="!bg-[#07c160] !border-[#07c160] rounded-xl h-12 mb-3"
      >
        开始写论文
      </van-button>

      <!-- 跳过（最后一屏隐藏） -->
      <van-button
        v-if="current < steps.length - 1"
        plain
        block
        data-testid="skip-btn"
        @click="handleSkip"
        class="!border-gray-100 !text-gray-400 rounded-xl h-12"
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
import { ONBOARDING_STEPS } from './onboarding-steps'

const emit = defineEmits<{
  complete: []
  skip: []
}>()

const router = useRouter()
const authStore = useAuthStore()
const current = ref(0)
const loading = ref(false)

const steps = ONBOARDING_STEPS

function handleNext(): void {
  if (current.value < steps.length - 1) {
    current.value++
  }
}

async function handleComplete(): Promise<void> {
  loading.value = true
  try {
    await authStore.completeOnboarding()
    emit('complete')
    await router.push('/wizard/1')
  } finally {
    loading.value = false
  }
}

async function handleSkip(): Promise<void> {
  loading.value = true
  try {
    await authStore.completeOnboarding()
    emit('skip')
    await router.push('/wizard/1')
  } finally {
    loading.value = false
  }
}
</script>
