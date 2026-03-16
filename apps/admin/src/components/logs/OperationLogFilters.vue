<template>
  <div class="flex flex-wrap items-end gap-3">
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-500">操作类型</label>
      <input v-model="localFilters.actionType" type="text" class="input-field w-36 text-sm" placeholder="如 ORDER_RETRY" />
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-500">对象类型</label>
      <input v-model="localFilters.targetType" type="text" class="input-field w-32 text-sm" placeholder="如 Order" />
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-500">开始时间</label>
      <input v-model="localFilters.startDate" type="date" class="input-field w-36 text-sm" />
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-xs text-gray-500">结束时间</label>
      <input v-model="localFilters.endDate" type="date" class="input-field w-36 text-sm" />
    </div>
    <button class="btn-primary" @click="handleSearch">搜索</button>
    <button class="btn-secondary" @click="handleReset">重置</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { OperationLogListQueryDto } from '@ai-paper/shared'

const props = defineProps<{ modelValue: OperationLogListQueryDto }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: OperationLogListQueryDto): void
  (e: 'search'): void
}>()

const localFilters = ref<OperationLogListQueryDto>({ ...props.modelValue })

watch(() => props.modelValue, (val) => {
  localFilters.value = { ...val }
})

function handleSearch(): void {
  emit('update:modelValue', { ...localFilters.value })
  emit('search')
}

function handleReset(): void {
  localFilters.value = {}
  emit('update:modelValue', {})
  emit('search')
}
</script>
