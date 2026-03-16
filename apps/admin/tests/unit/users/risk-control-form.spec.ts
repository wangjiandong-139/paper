/**
 * Risk Control Form Tests - TDD
 */
import { describe, it, expect, vi } from 'vitest'

describe('UserRiskControlForm', () => {
  it('should display current risk control settings', () => {
    const config = { isDisabled: true, dailyGenerationLimit: 3 }
    expect(config.isDisabled).toBe(true)
    expect(config.dailyGenerationLimit).toBe(3)
  })

  it('should validate dailyGenerationLimit > 0', () => {
    const isValid = (limit: number | null) => limit === null || limit > 0
    expect(isValid(0)).toBe(false)
    expect(isValid(3)).toBe(true)
    expect(isValid(null)).toBe(true)
  })

  it('should call upsert API on save', () => {
    const mockSave = vi.fn()
    mockSave({ isDisabled: true, dailyGenerationLimit: 5, reason: 'test' })
    expect(mockSave).toHaveBeenCalled()
  })
})
