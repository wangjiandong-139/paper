<template>
  <span :class="badgeClass">
    {{ statusLabel }}
    <span v-if="isOverdue" class="ml-1" title="运行超过2小时">⚠️</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GenerationJobStatus } from '@ai-paper/shared'

const props = defineProps<{
  status: GenerationJobStatus
  isOverdue?: boolean
}>()

const STATUS_LABELS: Record<GenerationJobStatus, string> = {
  [GenerationJobStatus.QUEUED]: '等待中',
  [GenerationJobStatus.RUNNING]: '生成中',
  [GenerationJobStatus.COMPLETED]: '已完成',
  [GenerationJobStatus.FAILED]: '已失败',
}

const STATUS_CLASSES: Record<GenerationJobStatus, string> = {
  [GenerationJobStatus.QUEUED]: 'badge badge-gray',
  [GenerationJobStatus.RUNNING]: 'badge badge-info',
  [GenerationJobStatus.COMPLETED]: 'badge badge-success',
  [GenerationJobStatus.FAILED]: 'badge badge-danger',
}

const statusLabel = computed(() => STATUS_LABELS[props.status])
const badgeClass = computed(() => STATUS_CLASSES[props.status])
</script>
