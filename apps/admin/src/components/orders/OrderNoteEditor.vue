<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">订单备注</label>
    <textarea
      v-model="noteText"
      class="input-field h-20 resize-none"
      placeholder="添加备注..."
    />
    <div class="flex items-center gap-2">
      <button class="btn-primary text-xs" :disabled="isSaving" @click="handleSave">
        {{ isSaving ? '保存中...' : '保存备注' }}
      </button>
      <span v-if="saved" class="text-xs text-green-600">已保存</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { updateOrderNote } from '@/services/orders/admin-orders.service'

const props = defineProps<{
  orderId: string
  initialNote: string | null
}>()

const noteText = ref(props.initialNote ?? '')
const isSaving = ref(false)
const saved = ref(false)

watch(() => props.initialNote, (val) => {
  noteText.value = val ?? ''
})

async function handleSave(): Promise<void> {
  isSaving.value = true
  saved.value = false
  try {
    await updateOrderNote(props.orderId, noteText.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } finally {
    isSaving.value = false
  }
}
</script>
