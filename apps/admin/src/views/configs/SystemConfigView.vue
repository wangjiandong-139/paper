<template>
  <div class="space-y-4">
    <h1 class="text-lg font-semibold text-gray-900">系统配置</h1>
    <div v-if="isLoading" class="text-center text-gray-400 py-8">加载中...</div>
    <div v-else class="card p-5 space-y-4">
      <div class="flex items-center gap-3">
        <input id="maintenanceMode" v-model="form.maintenanceMode" type="checkbox" />
        <label for="maintenanceMode" class="text-sm text-gray-700">维护模式（用户端暂停服务）</label>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">默认建议选题</label>
        <input v-model="form.defaultSuggestedTopic" type="text" class="input-field text-sm" placeholder="留空则不显示" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">默认单日生成上限</label>
        <input v-model.number="form.maxDailyGenerationDefault" type="number" min="1" class="input-field w-32 text-sm" />
      </div>
      <button class="btn-primary text-xs" :disabled="isSaving" @click="handleSave">
        {{ isSaving ? '保存中...' : '保存配置' }}
      </button>
      <span v-if="saved" class="text-xs text-green-600">已保存</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import type { SystemConfigDto } from '@ai-paper/shared'

const isLoading = ref(false)
const isSaving = ref(false)
const saved = ref(false)
const form = ref<SystemConfigDto>({
  maintenanceMode: false,
  defaultSuggestedTopic: null,
  maxDailyGenerationDefault: 5,
})

async function loadConfig(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/configs/system')
    form.value = res.data
  } finally {
    isLoading.value = false
  }
}

async function handleSave(): Promise<void> {
  isSaving.value = true
  saved.value = false
  try {
    await adminApi.put('/configs/system', form.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } finally {
    isSaving.value = false
  }
}

onMounted(loadConfig)
</script>
