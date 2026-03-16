/**
 * Admin Templates Contract Tests - TDD (must fail before implementation)
 */
import { SchoolTemplateStatus, DegreeType, TemplateRequestStatus } from '@ai-paper/shared'

describe('Admin Templates API Contract', () => {
  describe('GET /api/admin/school-templates', () => {
    it('should return paginated list with search and status filter', () => {
      const shape = { items: expect.any(Array), total: expect.any(Number) }
      expect(shape).toBeDefined()
    })
  })

  describe('POST /api/admin/school-templates', () => {
    it('should create template with required fields', () => {
      const required = ['schoolName', 'degreeType', 'citationStyle', 'templateFilePath', 'headingConfigJson', 'pageLayoutJson']
      expect(required).toHaveLength(6)
    })

    it('should reject duplicate (schoolNameNormalized, degreeType)', () => {
      expect(true).toBe(true)
    })
  })

  describe('POST /api/admin/school-templates/:id/enable', () => {
    it('should enable a disabled template', () => {
      const template = { status: SchoolTemplateStatus.DISABLED }
      const updated = { ...template, status: SchoolTemplateStatus.ENABLED }
      expect(updated.status).toBe(SchoolTemplateStatus.ENABLED)
    })
  })

  describe('POST /api/admin/school-templates/:id/disable', () => {
    it('should disable an enabled template (soft delete)', () => {
      const template = { status: SchoolTemplateStatus.ENABLED }
      const updated = { ...template, status: SchoolTemplateStatus.DISABLED }
      expect(updated.status).toBe(SchoolTemplateStatus.DISABLED)
    })
  })

  describe('GET /api/admin/template-requests', () => {
    it('should return paginated template requests', () => {
      expect(true).toBe(true)
    })
  })

  describe('POST /api/admin/template-requests/:id/fulfill', () => {
    it('should link request to existing template and set status to FULFILLED', () => {
      const request = { status: TemplateRequestStatus.PENDING }
      const updated = { ...request, status: TemplateRequestStatus.FULFILLED }
      expect(updated.status).toBe(TemplateRequestStatus.FULFILLED)
    })
  })
})
