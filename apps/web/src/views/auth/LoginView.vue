<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-white px-6">
    <div class="w-full max-w-sm">
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold text-primary mb-2">AI 写论文</h1>
        <p class="text-gray-500 text-sm">傻瓜式六步完成论文</p>
      </div>

      <van-button
        type="primary"
        block
        size="large"
        :loading="loading"
        @click="handleWechatLogin"
        class="!bg-primary !border-primary rounded-xl h-12"
      >
        <span class="flex items-center justify-center gap-2">
          <span>微信登录</span>
        </span>
      </van-button>

      <p class="text-center text-xs text-gray-400 mt-6">
        登录即代表同意《用户协议》和《隐私政策》
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)

async function handleWechatLogin(): Promise<void> {
  loading.value = true
  try {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) {
      showToast('请通过微信打开以使用微信登录')
      return
    }
    await authStore.loginWithWechat(code)
    const redirect = (route.query.redirect as string) || '/wizard/1'
    await router.push(redirect)
  } catch {
    showToast('登录失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>
