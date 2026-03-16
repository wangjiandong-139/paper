<template>
  <div class="space-y-3">
    <h3 class="text-sm font-semibold text-gray-700">任务日志</h3>
    <div v-if="eventLogs.length === 0" class="text-sm text-gray-400">暂无日志</div>
    <ol v-else class="relative border-l border-gray-200 ml-3 space-y-4">
      <li
        v-for="log in sortedLogs"
        :key="log.id"
        class="ml-4"
      >
        <div class="absolute w-3 h-3 bg-gray-200 rounded-full -left-1.5 border border-white" />
        <div class="flex items-start gap-2">
          <span :class="eventTypeClass(log.eventType)" class="badge text-xs mt-0.5">
            {{ eventTypeLabel(log.eventType) }}
          </span>
          <div class="flex-1">
            <p class="text-xs text-gray-500">{{ formatTime(log.createdAt) }}</p>
            <p class="text-sm text-gray-700 mt-0.5">
              <span v-if="log.chapterNo" class="font-medium">第{{ log.chapterNo }}章 · </span>
              {{ log.message }}
            </p>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GenerationJobEventType } from '@ai-paper/shared'
import type { GenerationJobEventLogDto } from '@ai-paper/shared'

const props = defineProps<{
  eventLogs: GenerationJobEventLogDto[]
}>()

const sortedLogs = computed(() =>
  [...props.eventLogs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  ),
)

function eventTypeLabel(type: GenerationJobEventType): string {
  const labels: Record<GenerationJobEventType, string> = {
    [GenerationJobEventType.QUEUED]: '入队',
    [GenerationJobEventType.CHAPTER_STARTED]: '开始',
    [GenerationJobEventType.CHAPTER_COMPLETED]: '完成',
    [GenerationJobEventType.WARNING]: '警告',
    [GenerationJobEventType.ERROR]: '错误',
  }
  return labels[type]
}

function eventTypeClass(type: GenerationJobEventType): string {
  if (type === GenerationJobEventType.ERROR) return 'badge-danger'
  if (type === GenerationJobEventType.WARNING) return 'badge-warning'
  if (type === GenerationJobEventType.CHAPTER_COMPLETED) return 'badge-success'
  return 'badge-gray'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN')
}
</script>
