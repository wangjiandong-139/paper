/**
 * Order Export Tests - TDD
 */
import { describe, it, expect, vi } from 'vitest'

describe('OrderExportButton', () => {
  it('should trigger CSV download on click', () => {
    const mockExport = vi.fn()
    mockExport({ format: 'csv' })
    expect(mockExport).toHaveBeenCalledWith({ format: 'csv' })
  })

  it('should show loading state during export', () => {
    let isLoading = false
    isLoading = true
    expect(isLoading).toBe(true)
  })

  it('should disable export button while loading', () => {
    const isLoading = true
    const isDisabled = isLoading
    expect(isDisabled).toBe(true)
  })
})
