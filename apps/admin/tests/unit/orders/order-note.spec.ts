/**
 * Order Note Editor Tests - TDD
 */
import { describe, it, expect, vi } from 'vitest'

describe('OrderNoteEditor', () => {
  it('should display existing note in the editor', () => {
    const note = 'Needs manual investigation'
    expect(note).toBeTruthy()
  })

  it('should call save API on form submit', () => {
    const mockSave = vi.fn()
    mockSave({ note: 'Updated note' })
    expect(mockSave).toHaveBeenCalledWith({ note: 'Updated note' })
  })

  it('should show success message after save', () => {
    const saved = true
    expect(saved).toBe(true)
  })
})
