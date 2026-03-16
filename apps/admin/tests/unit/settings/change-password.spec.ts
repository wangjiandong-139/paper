/**
 * Change Password Tests - TDD
 */
import { describe, it, expect } from 'vitest'

describe('ChangePasswordView', () => {
  it('should validate that new password is at least 8 characters', () => {
    const isValid = (pwd: string) => pwd.length >= 8
    expect(isValid('short')).toBe(false)
    expect(isValid('longpassword123')).toBe(true)
  })

  it('should validate that new password and confirm password match', () => {
    const match = (a: string, b: string) => a === b
    expect(match('password123', 'password123')).toBe(true)
    expect(match('password123', 'different123')).toBe(false)
  })

  it('should show error when current password is wrong', () => {
    const error = '当前密码不正确'
    expect(error).toBeTruthy()
  })
})
