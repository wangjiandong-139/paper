import { describe, it, expect } from 'vitest'
import { authGuard } from '../guards'
import type { AuthState } from '../guards'

function makeTo(name: string, meta: Record<string, unknown> = {}, fullPath = `/${name}`) {
  return { name, meta, fullPath }
}

const AUTHENTICATED: AuthState = { isAuthenticated: true, needsOnboarding: false }
const UNAUTHENTICATED: AuthState = { isAuthenticated: false, needsOnboarding: false }
const NEEDS_ONBOARDING: AuthState = { isAuthenticated: true, needsOnboarding: true }

describe('authGuard', () => {
  describe('未登录用户', () => {
    it('访问 requiresAuth 路由时跳转登录页并携带 redirect', () => {
      const result = authGuard(
        makeTo('Wizard', { requiresAuth: true }, '/wizard/1'),
        UNAUTHENTICATED,
      )
      expect(result).toEqual({ name: 'Login', query: { redirect: '/wizard/1' } })
    })

    it('访问 /orders 时跳转登录页', () => {
      const result = authGuard(
        makeTo('Orders', { requiresAuth: true }, '/orders'),
        UNAUTHENTICATED,
      )
      expect(result).toEqual({ name: 'Login', query: { redirect: '/orders' } })
    })

    it('访问登录页本身不跳转', () => {
      const result = authGuard(
        makeTo('Login', { requiresAuth: false }, '/login'),
        UNAUTHENTICATED,
      )
      expect(result).toBeUndefined()
    })
  })

  describe('已登录用户（onboarding 已完成）', () => {
    it('访问登录页时跳转 /wizard/1', () => {
      const result = authGuard(
        makeTo('Login', { requiresAuth: false }, '/login'),
        AUTHENTICATED,
      )
      expect(result).toEqual({ path: '/wizard/1' })
    })

    it('访问 /wizard/1 正常放行（返回 undefined）', () => {
      const result = authGuard(
        makeTo('Wizard', { requiresAuth: true }, '/wizard/1'),
        AUTHENTICATED,
      )
      expect(result).toBeUndefined()
    })

    it('访问 /orders 正常放行', () => {
      const result = authGuard(
        makeTo('Orders', { requiresAuth: true }, '/orders'),
        AUTHENTICATED,
      )
      expect(result).toBeUndefined()
    })

    it('访问 /onboarding 正常放行（不循环重定向）', () => {
      const result = authGuard(
        makeTo('Onboarding', { requiresAuth: true }, '/onboarding'),
        NEEDS_ONBOARDING,
      )
      expect(result).toBeUndefined()
    })
  })

  describe('已登录但未完成引导', () => {
    it('访问 /wizard/1 跳转 /onboarding', () => {
      const result = authGuard(
        makeTo('Wizard', { requiresAuth: true }, '/wizard/1'),
        NEEDS_ONBOARDING,
      )
      expect(result).toEqual({ name: 'Onboarding' })
    })

    it('访问 /orders 跳转 /onboarding', () => {
      const result = authGuard(
        makeTo('Orders', { requiresAuth: true }, '/orders'),
        NEEDS_ONBOARDING,
      )
      expect(result).toEqual({ name: 'Onboarding' })
    })

    it('访问登录页跳转 /wizard/1（已登录优先）', () => {
      const result = authGuard(
        makeTo('Login', { requiresAuth: false }, '/login'),
        NEEDS_ONBOARDING,
      )
      expect(result).toEqual({ path: '/wizard/1' })
    })
  })
})
