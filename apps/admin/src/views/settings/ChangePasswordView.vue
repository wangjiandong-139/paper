<template>
  <div class="max-w-md space-y-4">
    <h1 class="text-lg font-semibold text-gray-900">修改密码</h1>
    <div class="card p-5 space-y-4">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">当前密码</label>
        <input v-model="form.currentPassword" type="password" class="input-field text-sm" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">新密码（至少8位，含字母和数字）</label>
        <input v-model="form.newPassword" type="password" class="input-field text-sm" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">确认新密码</label>
        <input v-model="form.confirmPassword" type="password" class="input-field text-sm" />
      </div>
      <div v-if="error" class="text-sm text-red-600 bg-red-50 rounded p-2">{{ error }}</div>
      <div v-if="success" class="text-sm text-green-600 bg-green-50 rounded p-2">密码已修改成功</div>
      <button class="btn-primary text-xs" :disabled="isSaving" @click="handleSave">
        {{ isSaving ? '处理中...' : '确认修改' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { adminApi } from '@/services/http/admin-api'

const form = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const isSaving = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

async function handleSave(): Promise<void> {
  error.value = null
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = '两次输入的新密码不一致'
    return
  }
  if (form.value.newPassword.length < 8) {
    error.value = '新密码至少需要8位'
    return
  }
  isSaving.value = true
  try {
    await adminApi.post('/auth/change-password', {
      currentPassword: form.value.currentPassword,
      newPassword: form.value.newPassword,
    })
    success.value = true
    form.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? '修改失败，请检查当前密码是否正确'
  } finally {
    isSaving.value = false
  }
}
</script>
