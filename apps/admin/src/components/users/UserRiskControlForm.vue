<template>
  <div class="card p-5 space-y-4">
    <h2 class="text-sm font-semibold text-gray-700">风控配置</h2>
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <input id="isDisabled" v-model="form.isDisabled" type="checkbox" class="rounded border-gray-300" />
        <label for="isDisabled" class="text-sm text-gray-700">禁止新登录</label>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">单日生成上限（留空表示无限制）</label>
        <input
          v-model.number="form.dailyGenerationLimit"
          type="number"
          min="1"
          class="input-field w-40 text-sm"
          placeholder="无限制"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">备注</label>
        <input v-model="form.reason" type="text" class="input-field text-sm" placeholder="风控原因..." />
      </div>
      <button class="btn-primary text-xs" :disabled="isSaving" @click="handleSave">
        {{ isSaving ? '保存中...' : '保存风控配置' }}
      </button>
      <span v-if="saved" class="text-xs text-green-600">已保存</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import type { UserRiskControlDto } from '@ai-paper/shared'

const props = defineProps<{
  userId: string
  initialConfig: UserRiskControlDto | null
}>()

const emit = defineEmits<{ (e: 'updated'): void }>()

const form = ref({
  isDisabled: props.initialConfig?.isDisabled ?? false,
  dailyGenerationLimit: props.initialConfig?.dailyGenerationLimit ?? null,
  reason: props.initialConfig?.reason ?? '',
})
const isSaving = ref(false)
const saved = ref(false)

watch(() => props.initialConfig, (config) => {
  if (config) {
    form.value = {
      isDisabled: config.isDisabled,
      dailyGenerationLimit: config.dailyGenerationLimit,
      reason: config.reason ?? '',
    }
  }
})

async function handleSave(): Promise<void> {
  isSaving.value = true
  saved.value = false
  try {
    await adminApi.put(`/users/${props.userId}/risk-controls`, {
      isDisabled: form.value.isDisabled,
      dailyGenerationLimit: form.value.dailyGenerationLimit,
      reason: form.value.reason || null,
    })
    saved.value = true
    emit('updated')
    setTimeout(() => { saved.value = false }, 2000)
  } finally {
    isSaving.value = false
  }
}
</script>
