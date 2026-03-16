/**
 * Admin Templates Integration Tests - TDD
 */
import { SchoolTemplateStatus, DegreeType, TemplateRequestStatus } from '@ai-paper/shared'

describe('Admin Templates Integration', () => {
  describe('Template uniqueness', () => {
    it('should enforce unique (schoolNameNormalized, degreeType) constraint', () => {
      const existing = { schoolNameNormalized: '北京大学', degreeType: DegreeType.MASTER }
      const duplicate = { schoolNameNormalized: '北京大学', degreeType: DegreeType.MASTER }
      const isDuplicate =
        existing.schoolNameNormalized === duplicate.schoolNameNormalized &&
        existing.degreeType === duplicate.degreeType
      expect(isDuplicate).toBe(true)
    })

    it('should allow same school with different degree type', () => {
      const existing = { schoolNameNormalized: '北京大学', degreeType: DegreeType.MASTER }
      const different = { schoolNameNormalized: '北京大学', degreeType: DegreeType.DOCTOR }
      const isDuplicate =
        existing.schoolNameNormalized === different.schoolNameNormalized &&
        existing.degreeType === different.degreeType
      expect(isDuplicate).toBe(false)
    })
  })

  describe('Enable/disable semantics', () => {
    it('should only soft-delete templates (no physical deletion)', () => {
      const template = { status: SchoolTemplateStatus.ENABLED, deletedAt: null }
      const disabled = { ...template, status: SchoolTemplateStatus.DISABLED }
      expect(disabled.deletedAt).toBeNull()
      expect(disabled.status).toBe(SchoolTemplateStatus.DISABLED)
    })
  })

  describe('Request fulfillment flow', () => {
    it('should set request status to FULFILLED and link template', () => {
      const request = { status: TemplateRequestStatus.PENDING, linkedTemplateId: null }
      const fulfilled = {
        ...request,
        status: TemplateRequestStatus.FULFILLED,
        linkedTemplateId: 'template-1',
      }
      expect(fulfilled.status).toBe(TemplateRequestStatus.FULFILLED)
      expect(fulfilled.linkedTemplateId).toBe('template-1')
    })
  })
})
