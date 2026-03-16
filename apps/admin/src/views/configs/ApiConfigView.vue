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

    <!-- Edit modal -->
    <div v-if="editingConfig" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 class="text-base font-semibold text-gray-900">
          编辑{{ editingConfig.configType === 'PLAGIARISM' ? '查重' : '引用核对' }}配置
        </h2>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">服务商名称</label>
          <input v-model="editForm.providerName" type="text" class="input-field text-sm" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">接口地址</label>
          <input v-model="editForm.baseUrl" type="url" class="input-field text-sm font-mono" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-500">密钥（留空保持原值）</label>
          <input v-model="editForm.secret" type="password" class="input-field text-sm font-mono" placeholder="输入新密钥..." autocomplete="new-password" />
          <p class="text-xs text-gray-400">密钥保存后不可查看明文，仅显示掩码</p>
        </div>
        <div class="flex items-center gap-2">
          <input id="isEnabled" v-model="editForm.isEnabled" type="checkbox" class="rounded" />
          <label for="isEnabled" class="text-sm text-gray-700">启用此服务</label>
        </div>

        <!-- Connectivity test result -->
        <div v-if="connectivityResult" :class="connectivityResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'" class="rounded-md px-3 py-2 text-xs">
          <span v-if="connectivityResult.success">✅ 连通测试通过（{{ connectivityResult.latencyMs }}ms）</span>
          <span v-else>❌ 连通测试失败：{{ connectivityResult.errorMessage }}</span>
        </div>

        <div class="flex items-center justify-between">
          <button
            class="btn-secondary text-xs"
            :disabled="isTesting"
            @click="testConnectivity"
          >
            {{ isTesting ? '测试中...' : '测试连通性' }}
          </button>
          <div class="flex items-center gap-2">
            <button class="btn-secondary text-xs" @click="closeModal">取消</button>
            <button
              class="btn-primary text-xs"
              :disabled="isSaving || connectivityResult?.success === false"
              :title="connectivityResult?.success === false ? '请先通过连通性测试' : ''"
              @click="saveConfig"
            >
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
        <p v-if="connectivityResult?.success === false" class="text-xs text-red-500">连通性测试失败，无法保存。请修正配置后重新测试。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/services/http/admin-api'
import type { ApiConfigListItemDto, ConnectivityTestResultDto } from '@ai-paper/shared'

const configs = ref<ApiConfigListItemDto[]>([])
const isLoading = ref(false)
const editingConfig = ref<ApiConfigListItemDto | null>(null)
const isTesting = ref(false)
const isSaving = ref(false)
const connectivityResult = ref<ConnectivityTestResultDto | null>(null)

const editForm = ref({
  providerName: '',
  baseUrl: '',
  secret: '',
  isEnabled: true,
})

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
  editingConfig.value = config
  editForm.value = {
    providerName: config.providerName,
    baseUrl: config.baseUrl,
    secret: '',
    isEnabled: config.isEnabled,
  }
  connectivityResult.value = null
}

function closeModal(): void {
  editingConfig.value = null
  connectivityResult.value = null
}

async function testConnectivity(): Promise<void> {
  if (!editingConfig.value) return
  isTesting.value = true
  connectivityResult.value = null
  try {
    const res = await adminApi.post('/configs/api/test-connectivity', {
      configType: editingConfig.value.configType,
      baseUrl: editForm.value.baseUrl,
      secret: editForm.value.secret || undefined,
    })
    connectivityResult.value = res.data as ConnectivityTestResultDto
  } catch {
    connectivityResult.value = { success: false, latencyMs: null, errorMessage: '请求失败，请检查地址格式' }
  } finally {
    isTesting.value = false
  }
}

async function saveConfig(): Promise<void> {
  if (!editingConfig.value) return
  if (connectivityResult.value === null) {
    alert('请先执行连通性测试，确认接口可用后再保存。')
    return
  }
  if (!connectivityResult.value.success) {
    return
  }
  isSaving.value = true
  try {
    await adminApi.put(`/configs/api/${editingConfig.value.id}`, {
      providerName: editForm.value.providerName,
      baseUrl: editForm.value.baseUrl,
      secret: editForm.value.secret || undefined,
      isEnabled: editForm.value.isEnabled,
    })
    closeModal()
    await loadConfigs()
  } finally {
    isSaving.value = false
  }
}

onMounted(loadConfigs)
</script>
