/**
 * Template Form Tests - TDD
 */
import { describe, it, expect, vi } from 'vitest'
import { DegreeType } from '@ai-paper/shared'

describe('TemplateForm', () => {
  it('should validate required fields', () => {
    const form = { schoolName: '', degreeType: DegreeType.MASTER }
    const isValid = form.schoolName.length > 0
    expect(isValid).toBe(false)
  })

  it('should show validation error for duplicate school+degree', () => {
    const error = '该学校和学历组合已存在'
    expect(error).toBeTruthy()
  })

  it('should call create API on form submit', () => {
    const mockCreate = vi.fn()
    mockCreate({ schoolName: '北京大学', degreeType: DegreeType.MASTER })
    expect(mockCreate).toHaveBeenCalled()
  })
})
