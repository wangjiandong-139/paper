<template>
  <div class="wizard-progress bg-white border-b border-gray-100 sticky top-0 z-30">
    <!-- 顶部文本进度 -->
    <div class="flex items-center justify-between px-4 pt-2 pb-1">
      <span class="text-xs text-gray-500">{{ getCurrentStepLabel(currentStep) }}</span>
      <span class="text-xs font-semibold text-green-600" data-testid="progress-text">
        {{ getProgressText(currentStep) }}
      </span>
    </div>

    <!-- 步骤圆点序列 -->
    <div class="flex items-center px-4 pb-3 overflow-x-auto" role="tablist">
      <template v-for="(config, index) in WIZARD_STEPS" :key="config.step">
        <!-- 步骤节点 -->
        <button
          class="step-node flex flex-col items-center flex-shrink-0 focus:outline-none"
          :class="[isStepClickable(config.step, currentStep) ? 'cursor-pointer' : 'cursor-default']"
          :aria-label="`步骤 ${config.step}：${config.label}`"
          :aria-current="config.step === currentStep ? 'step' : undefined"
          :disabled="!isStepClickable(config.step, currentStep)"
          :data-testid="`step-${config.step}`"
          role="tab"
          @click="handleStepClick(config.step)"
        >
          <!-- 圆圈指示器（触摸热区 ≥ 44pt 通过 min-w/min-h 保证） -->
          <div
            class="flex items-center justify-center rounded-full text-xs font-bold transition-all duration-200"
            :class="getCircleClass(config.step)"
            style="min-width: 28px; min-height: 28px;"
          >
            <van-icon v-if="getStepState(config.step, currentStep) === 'completed'" name="success" size="14" />
            <span v-else>{{ config.step }}</span>
          </div>
          <!-- 步骤短标签 -->
          <span
            class="mt-1 text-center whitespace-nowrap transition-colors duration-200"
            :class="getLabelClass(config.step)"
            style="font-size: 10px; line-height: 1.2;"
          >
            {{ config.shortLabel }}
          </span>
        </button>

        <!-- 连接线（最后一步后不显示） -->
        <div
          v-if="index < WIZARD_STEPS.length - 1"
          class="flex-1 h-px mx-1"
          :class="config.step < currentStep ? 'bg-green-400' : 'bg-gray-200'"
          aria-hidden="true"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  WIZARD_STEPS,
  getStepState,
  isStepClickable,
  getProgressText,
  getCurrentStepLabel,
} from './wizard-progress'

// ─── Props ──────────────────────────────────────────────────

const props = defineProps<{
  currentStep: number
}>()

// ─── 事件 ──────────────────────────────────────────────────

const emit = defineEmits<{
  (e: 'step-click', step: number): void
}>()

// ─── 路由 ──────────────────────────────────────────────────

const router = useRouter()

// ─── 步骤点击 ──────────────────────────────────────────────────

function handleStepClick(step: number): void {
  if (!isStepClickable(step, props.currentStep)) return
  emit('step-click', step)
  router.push(`/wizard/${step}`)
}

// ─── 样式计算 ──────────────────────────────────────────────────

function getCircleClass(step: number): string {
  const state = getStepState(step, props.currentStep)
  if (state === 'completed') return 'bg-green-500 text-white'
  if (state === 'current') return 'bg-green-600 text-white ring-2 ring-green-200 scale-110'
  return 'bg-gray-200 text-gray-400'
}

function getLabelClass(step: number): string {
  const state = getStepState(step, props.currentStep)
  if (state === 'completed') return 'text-green-500'
  if (state === 'current') return 'text-green-700 font-semibold'
  return 'text-gray-400'
}
</script>

<style scoped>
/* 确保按钮触摸热区 ≥ 44pt（44px） */
.step-node {
  min-width: 44px;
  min-height: 44px;
  padding: 4px 2px;
  background: transparent;
  border: none;
}
</style>
