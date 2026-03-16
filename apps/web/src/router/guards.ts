import type { RouteLocationNormalized, NavigationGuardReturn } from 'vue-router'

export interface AuthState {
  isAuthenticated: boolean
  needsOnboarding: boolean
}

/**
 * 认证 + 引导守卫逻辑（纯函数，便于单元测试）
 */
export function authGuard(
  to: Pick<RouteLocationNormalized, 'name' | 'meta' | 'fullPath'>,
  auth: AuthState,
): NavigationGuardReturn {
  const requiresAuth = to.meta.requiresAuth !== false

  // 未登录 → 跳转登录页
  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // 已登录访问登录页 → 跳首页
  if (to.name === 'Login' && auth.isAuthenticated) {
    return { path: '/wizard/1' }
  }

  // 已登录但未完成引导（且不在 onboarding/login 页）→ 跳引导页
  if (
    auth.isAuthenticated &&
    auth.needsOnboarding &&
    to.name !== 'Onboarding' &&
    to.name !== 'Login'
  ) {
    return { name: 'Onboarding' }
  }

  return undefined
}
