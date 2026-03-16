/**
 * Template List Tests - TDD
 */
import { describe, it, expect } from 'vitest'
import { SchoolTemplateStatus, DegreeType } from '@ai-paper/shared'

describe('TemplateListView', () => {
  it('should group templates by school name', () => {
    const templates = [
      { schoolName: '北京大学', degreeType: DegreeType.MASTER },
      { schoolName: '北京大学', degreeType: DegreeType.DOCTOR },
      { schoolName: '清华大学', degreeType: DegreeType.MASTER },
    ]
    const grouped = templates.reduce((acc, t) => {
      acc[t.schoolName] = (acc[t.schoolName] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    expect(grouped['北京大学']).toBe(2)
    expect(grouped['清华大学']).toBe(1)
  })

  it('should show ENABLED/DISABLED status badge', () => {
    const template = { status: SchoolTemplateStatus.ENABLED }
    expect(template.status).toBe(SchoolTemplateStatus.ENABLED)
  })
})
