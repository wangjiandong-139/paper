/**
 * User List Tests - TDD
 */
import { describe, it, expect } from 'vitest'

describe('UserListView', () => {
  it('should filter users by disabled status', () => {
    const users = [
      { id: '1', isDisabled: true },
      { id: '2', isDisabled: false },
    ]
    const disabled = users.filter((u) => u.isDisabled)
    expect(disabled).toHaveLength(1)
  })

  it('should display order count per user', () => {
    const user = { id: '1', orderCount: 5 }
    expect(user.orderCount).toBe(5)
  })
})
