import type { Router } from 'vue-router'
import { useAdminAuthStore } from '@/stores/admin-auth.store'
import type { AdminRole } from '@ai-paper/shared'

export function setupRouterGuards(router: Router): void {
  router.beforeEach(async (to, _from, next) => {
    const authStore = useAdminAuthStore()

    const requiresAuth = to.meta.requiresAuth !== false

    if (!requiresAuth) {
      if (to.name === 'login' && authStore.isAuthenticated) {
        return next({ name: 'dashboard' })
      }
      return next()
    }

    if (!authStore.isAuthenticated) {
      await authStore.fetchCurrentUser()
    }

    if (!authStore.isAuthenticated) {
      return next({ name: 'login', query: { redirect: to.fullPath } })
    }

    const requiredRoles = to.meta.roles as AdminRole[] | undefined
    if (requiredRoles && requiredRoles.length > 0) {
      if (!authStore.role || !requiredRoles.includes(authStore.role)) {
        return next({ name: 'forbidden' })
      }
    }

    return next()
  })
}
