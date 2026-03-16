<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
      <h2 class="text-base font-semibold text-gray-900">{{ product ? '编辑商品' : '新建商品' }}</h2>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">商品编码</label>
          <input v-model="form.productCode" type="text" class="input-field text-sm" :disabled="!!product" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">名称</label>
          <input v-model="form.name" type="text" class="input-field text-sm" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">价格（分）</label>
          <input v-model.number="form.priceFen" type="number" min="0" class="input-field text-sm" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">改稿上限（留空无限）</label>
          <input v-model.number="form.revisionLimit" type="number" min="0" class="input-field text-sm" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">AI率保障阈值（留空不保障）</label>
          <input v-model.number="form.aiRateThreshold" type="number" min="0" max="100" step="0.1" class="input-field text-sm" />
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-500">说明</label>
        <textarea v-model="form.description" class="input-field text-sm h-16 resize-none" />
      </div>
      <div class="flex items-center justify-end gap-2">
        <button class="btn-secondary text-xs" @click="$emit('cancel')">取消</button>
        <button class="btn-primary text-xs" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import type { AdminProductListItemDto } from '@ai-paper/shared'

const props = defineProps<{ product: AdminProductListItemDto | null }>()
const emit = defineEmits<{ (e: 'saved'): void; (e: 'cancel'): void }>()

const form = ref({
  productCode: props.product?.productCode ?? '',
  name: props.product?.name ?? '',
  priceFen: props.product?.priceFen ?? 0,
  revisionLimit: props.product?.revisionLimit ?? null,
  aiRateThreshold: props.product?.aiRateThreshold ?? null,
  description: '',
})
const isSaving = ref(false)

async function handleSave(): Promise<void> {
  isSaving.value = true
  try {
    if (props.product) {
      await adminApi.put(`/products/${props.product.id}`, form.value)
    } else {
      await adminApi.post('/products', { ...form.value, benefitsJson: {} })
    }
    emit('saved')
  } finally {
    isSaving.value = false
  }
}
</script>
