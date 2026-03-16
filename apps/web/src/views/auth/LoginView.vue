<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-white px-6">
    <div class="w-full max-w-sm">
      <div class="text-center mb-10">
        <div class="text-5xl mb-4">📄</div>
        <h1 class="text-3xl font-bold text-gray-800 mb-2">AI 写论文</h1>
        <p class="text-gray-400 text-sm">傻瓜式六步完成学术论文</p>
      </div>

      <!-- 移动端：微信授权按钮 -->
      <template v-if="isMobile">
        <van-button
          type="primary"
          block
          size="large"
          :loading="loading"
          data-testid="wechat-login-btn"
          @click="handleMobileLogin"
          class="!bg-[#07c160] !border-[#07c160] rounded-xl h-12"
        >
          <span class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.69 12.24c-.49 0-.89-.4-.89-.89s.4-.89.89-.89.89.4.89.89-.4.89-.89.89zm4.62 0c-.49 0-.89-.4-.89-.89s.4-.89.89-.89.89.4.89.89-.4.89-.89.89zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
            <span>微信一键登录</span>
          </span>
        </van-button>

        <p class="text-center text-xs text-gray-400 mt-4">
          点击将跳转微信授权页面
        </p>
      </template>

      <!-- PC 端：微信扫码登录 -->
      <template v-else>
        <div class="border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
          <p class="text-gray-500 text-sm mb-4">使用微信扫码登录</p>
          <div
            class="w-44 h-44 mx-auto bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200"
            data-testid="qrcode-container"
          >
            <div v-if="qrcodeLoading" class="text-gray-300 text-sm">加载中…</div>
            <img
              v-else-if="qrcodeUrl"
              :src="qrcodeUrl"
              alt="微信扫码登录"
              class="w-40 h-40 rounded-lg"
            />
            <div v-else class="text-center">
              <div class="text-gray-300 text-4xl mb-2">📷</div>
              <p class="text-xs text-gray-400">二维码加载失败</p>
              <button
                class="text-xs text-[#07c160] mt-2 underline"
                @click="refreshQrcode"
              >
                刷新
              </button>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-4">扫码后在手机上确认登录</p>
        </div>
      </template>

      <p class="text-center text-xs text-gray-300 mt-8">
        登录即代表同意
        <a href="#" class="text-gray-400 underline">《用户协议》</a>
        和
        <a href="#" class="text-gray-400 underline">《隐私政策》</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)
const qrcodeLoading = ref(false)
const qrcodeUrl = ref<string | null>(null)
let pollingTimer: ReturnType<typeof setInterval> | null = null

const isMobile = ref(false)

function detectMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
}

async function handleMobileLogin(): Promise<void> {
  loading.value = true
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    if (!code) {
      const appId = import.meta.env.VITE_WECHAT_APP_ID ?? ''
      const redirectUri = encodeURIComponent(window.location.href)
      const scope = 'snsapi_userinfo'
      const state = 'login'
      window.location.href = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`
      return
    }
    await authStore.loginWithWechat(code)
    await redirectAfterLogin()
  } catch {
    showToast('登录失败，请重试')
  } finally {
    loading.value = false
  }
}

async function redirectAfterLogin(): Promise<void> {
  if (authStore.needsOnboarding) {
    await router.push('/onboarding')
  } else {
    const redirect = (route.query.redirect as string) || '/wizard/1'
    await router.push(redirect)
  }
}

async function refreshQrcode(): Promise<void> {
  qrcodeLoading.value = true
  try {
    qrcodeUrl.value = null
    startQrcodePolling()
  } finally {
    qrcodeLoading.value = false
  }
}

function startQrcodePolling(): void {
  if (pollingTimer) clearInterval(pollingTimer)
  pollingTimer = setInterval(async () => {
    try {
      const { data } = await import('@/lib/http').then((m) =>
        m.http.get<{ status: string; token?: string; user?: unknown }>('/auth/wechat/qrcode/poll'),
      )
      if (data.status === 'confirmed' && data.token) {
        clearInterval(pollingTimer!)
        authStore.token = data.token as string
        authStore.user = data.user as typeof authStore.user
        import('@/lib/http').then((m) => m.setAuthToken(data.token!))
        await redirectAfterLogin()
      }
    } catch {
      // continue polling
    }
  }, 2000)
}

onMounted(async () => {
  isMobile.value = detectMobile()

  if (!isMobile.value) {
    qrcodeLoading.value = true
    try {
      const { http } = await import('@/lib/http')
      const { data } = await http.get<{ url: string }>('/auth/wechat/qrcode')
      qrcodeUrl.value = data.url
      startQrcodePolling()
    } catch {
      qrcodeUrl.value = null
    } finally {
      qrcodeLoading.value = false
    }
  }
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})
</script>
