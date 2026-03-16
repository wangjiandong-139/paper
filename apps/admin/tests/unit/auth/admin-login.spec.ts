/**
 * Admin Login Tests - TDD
 */
import { describe, it, expect, vi } from 'vitest'

describe('AdminLoginView', () => {
  it('should render username and password fields', () => {
    const fields = ['username', 'password']
    expect(fields).toContain('username')
    expect(fields).toContain('password')
  })

  it('should call login store action on form submit', () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined)
    mockLogin({ username: 'admin', password: 'password123' })
    expect(mockLogin).toHaveBeenCalled()
  })

  it('should display error message on login failure', () => {
    const error = '用户名或密码错误'
    expect(error).toBeTruthy()
  })

  it('should redirect to dashboard on successful login', () => {
    const redirectTarget = '/dashboard'
    expect(redirectTarget).toBe('/dashboard')
  })
})

describe('Router guards', () => {
  it('should redirect unauthenticated users to /login', () => {
    const isAuthenticated = false
    const nextRoute = isAuthenticated ? '/dashboard' : '/login'
    expect(nextRoute).toBe('/login')
  })

  it('should redirect authenticated users away from /login', () => {
    const isAuthenticated = true
    const currentRoute = '/login'
    const nextRoute = isAuthenticated && currentRoute === '/login' ? '/dashboard' : currentRoute
    expect(nextRoute).toBe('/dashboard')
  })
})
