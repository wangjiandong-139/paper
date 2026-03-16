<template>
  <div class="space-y-4">
    <h1 class="text-lg font-semibold text-gray-900">API 配置管理</h1>
    <p class="text-sm text-gray-500">管理查重和引用核对的第三方服务配置。密钥始终以掩码显示。</p>

    <div v-if="isLoading" class="text-center text-gray-400 py-8">加载中...</div>

    <div v-for="config in configs" :key="config.id" class="card p-5 space-y-4">
      <h2 class="text-sm font-semibold text-gray-700">
        {{ config.configType === 'PLAGIARISM' ? '查重服务' : '引用核对服务' }}
      </h2>
      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt class="text-xs text-gray-500">服务商</dt>
          <dd class="text-gray-900">{{ config.providerName }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">接口地址</dt>
          <dd class="text-gray-900 font-mono text-xs">{{ config.baseUrl }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">密钥</dt>
          <dd class="text-gray-500 font-mono text-xs">{{ config.maskedSecret ?? '未设置' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-gray-500">状态</dt>
          <dd>
            <span :class="config.isEnabled ? 'badge-success' : 'badge-gray'" class="badge">
              {{ config.isEnabled ? '已启用' : '已停用' }}
            </span>
          </dd>
        </div>
      </dl>
      <button class="btn-secondary text-xs" @click="openEditModal(config)">编辑配置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import type { ApiConfigListItemDto } from '@ai-paper/shared'

const configs = ref<ApiConfigListItemDto[]>([])
const isLoading = ref(false)

async function loadConfigs(): Promise<void> {
  isLoading.value = true
  try {
    const res = await adminApi.get('/configs/api')
    configs.value = res.data.items ?? []
  } finally {
    isLoading.value = false
  }
}

function openEditModal(config: ApiConfigListItemDto): void {
  console.log('Edit config', config.id)
}

onMounted(loadConfigs)
</script>
