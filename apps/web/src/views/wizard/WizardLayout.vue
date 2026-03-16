<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- 向导进度条 -->
    <WizardProgress :current-step="currentStep" />
    <div class="flex-1">
      <component :is="currentStepComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import WizardProgress from '@/components/wizard/WizardProgress.vue'

const route = useRoute()

const stepComponents: Record<number, ReturnType<typeof defineAsyncComponent>> = {
  1: defineAsyncComponent(() => import('./Step1BasicInfo.vue')),
  2: defineAsyncComponent(() => import('./Step2References.vue')),
  3: defineAsyncComponent(() => import('./Step3Outline.vue')),
  4: defineAsyncComponent(() => import('./Step4Payment.vue')),
  5: defineAsyncComponent(() => import('./Step5Generating.vue')),
  6: defineAsyncComponent(() => import('./Step6Revision.vue')),
}

const currentStep = computed(() => Number(route.params.step) || 1)

const currentStepComponent = computed(() => {
  return stepComponents[currentStep.value] ?? stepComponents[1]
})
</script>
