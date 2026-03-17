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
        <label class="text-xs text-gray-500">最低文献数量（固定值，默认 1）</label>
        <input
          v-model.number="form.minReferenceCount"
          type="number"
          min="1"
          step="1"
          class="input-field w-32 text-sm"
          placeholder="1"
        />
        <p class="text-xs text-gray-400">步骤 2 参考文献至少需添加的篇数，全站统一，≥ 1 的整数</p>
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
      <span v-if="saveError" class="text-xs text-red-500">{{ saveError }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'

interface SystemConfigForm {
  maintenanceMode: boolean
  defaultSuggestedTopic: string | null
  maxDailyGenerationDefault: number
  minReferenceCount: number
}

const isLoading = ref(false)
const isSaving = ref(false)
const saved = ref(false)
const saveError = ref('')
const form = ref<SystemConfigForm>({
  maintenanceMode: false,
  defaultSuggestedTopic: null,
  maxDailyGenerationDefault: 5,
  minReferenceCount: 1,
})

async function loadConfig(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get<Array<{ key: string; value: string; description?: string }>>('/system-configs')
    const list = Array.isArray(res.data) ? res.data : []
    const byKey: Record<string, string> = {}
    list.forEach((item) => { byKey[item.key] = item.value })
    form.value = {
      maintenanceMode: byKey.maintenance_mode === 'true',
      defaultSuggestedTopic: form.value.defaultSuggestedTopic,
      maxDailyGenerationDefault: form.value.maxDailyGenerationDefault,
      minReferenceCount: Math.max(1, parseInt(byKey.min_reference_count ?? '1', 10) || 1),
    }
  } catch {
    // 保持默认值
  } finally {
    isLoading.value = false
  }
}

async function handleSave(): Promise<void> {
  saveError.value = ''
  const n = form.value.minReferenceCount
  if (Number.isNaN(n) || n < 1 || n !== Math.floor(n)) {
    saveError.value = '最低文献数量必须为 ≥ 1 的整数'
    return
  }
  isSaving.value = true
  saved.value = false
  try {
    await adminApi.patch('/system-configs/min_reference_count', { value: String(form.value.minReferenceCount) })
    await adminApi.patch('/system-configs/maintenance_mode', { value: form.value.maintenanceMode ? 'true' : 'false' })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch (e: unknown) {
    saveError.value = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '保存失败'
  } finally {
    isSaving.value = false
  }
}

onMounted(loadConfig)
</script>
