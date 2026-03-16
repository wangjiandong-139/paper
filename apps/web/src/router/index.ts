import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authGuard } from './guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/wizard/1',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/auth/OnboardingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/wizard/:step',
    name: 'Wizard',
    component: () => import('@/views/wizard/WizardLayout.vue'),
    meta: { requiresAuth: true },
    beforeEnter: (to) => {
      const step = Number(to.params.step)
      if (isNaN(step) || step < 1 || step > 6) {
        return { path: '/wizard/1' }
      }
    },
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/orders/OrdersView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  return authGuard(to, {
    isAuthenticated: authStore.isAuthenticated,
    needsOnboarding: authStore.needsOnboarding,
  })
})

export default router
