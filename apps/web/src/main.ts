import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Vant from 'vant'
import 'vant/lib/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(Vant)
app.mount('#app')

// 401 时清除登录态并跳转登录页（带 redirect）
window.addEventListener('auth:unauthorized', () => {
  const authStore = useAuthStore(pinia)
  authStore.logout()
  const redirect = router.currentRoute.value.fullPath
  router.push(redirect ? { path: '/login', query: { redirect } } : '/login')
})

// 开发/测试环境下暴露 pinia 和 router，供 E2E 测试注入状态和客户端导航
if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>
  w.__pinia__ = pinia
  w.__router__ = router
}
