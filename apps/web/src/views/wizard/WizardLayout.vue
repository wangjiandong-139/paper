<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <div class="flex-1">
      <component :is="currentStepComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const stepComponents: Record<number, ReturnType<typeof defineAsyncComponent>> = {
  1: defineAsyncComponent(() => import('./Step1BasicInfo.vue')),
  2: defineAsyncComponent(() => import('./Step2References.vue')),
  3: defineAsyncComponent(() => import('./Step3Outline.vue')),
  4: defineAsyncComponent(() => import('./Step4Payment.vue')),
  5: defineAsyncComponent(() => import('./Step5Generating.vue')),
  6: defineAsyncComponent(() => import('./Step6Revision.vue')),
}

const currentStepComponent = computed(() => {
  const step = Number(route.params.step)
  return stepComponents[step] ?? stepComponents[1]
})
</script>
