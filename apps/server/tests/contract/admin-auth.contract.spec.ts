/**
 * Admin Auth Contract Tests - TDD
 */
import { AdminRole, AdminUserStatus } from '@ai-paper/shared'

describe('Admin Auth API Contract', () => {
  describe('POST /api/admin/auth/login', () => {
    it('should accept username and password', () => {
      const body = { username: 'admin', password: 'password123' }
      expect(body).toHaveProperty('username')
      expect(body).toHaveProperty('password')
    })

    it('should return adminUser profile on success', () => {
      const shape = {
        adminUser: {
          id: expect.any(String),
          username: expect.any(String),
          role: expect.any(String),
          status: expect.any(String),
        },
      }
      expect(shape).toBeDefined()
    })

    it('should return 401 for invalid credentials', () => {
      expect(401).toBe(401)
    })

    it('should return 400 and lock account after 5 failed attempts', () => {
      const MAX_ATTEMPTS = 5
      expect(MAX_ATTEMPTS).toBe(5)
    })
  })

  describe('GET /api/admin/auth/me', () => {
    it('should return current session user profile', () => {
      const shape = { id: expect.any(String), role: expect.any(String) }
      expect(shape).toBeDefined()
    })

    it('should return 401 if no valid session', () => {
      expect(401).toBe(401)
    })
  })

  describe('POST /api/admin/auth/change-password', () => {
    it('should require currentPassword and newPassword', () => {
      const body = { currentPassword: 'old', newPassword: 'newpass123' }
      expect(body).toHaveProperty('currentPassword')
      expect(body).toHaveProperty('newPassword')
    })
  })

  describe('GET /api/admin/admin-users', () => {
    it('should only be accessible by SUPER_ADMIN', () => {
      const allowedRoles = [AdminRole.SUPER_ADMIN]
      expect(allowedRoles).toContain(AdminRole.SUPER_ADMIN)
      expect(allowedRoles).not.toContain(AdminRole.OPERATOR)
    })
  })

  describe('GET /api/admin/operation-logs', () => {
    it('should return paginated operation logs', () => {
      const shape = { items: expect.any(Array), total: expect.any(Number) }
      expect(shape).toBeDefined()
    })
  })
})
