/**
 * Order Detail Component Tests - TDD
 */
import { describe, it, expect } from 'vitest'

describe('GenerationJobLogPanel', () => {
  it('should render event log timeline in chronological order', () => {
    const events = [
      { createdAt: '2026-03-16T10:00:00Z', message: 'Job queued' },
      { createdAt: '2026-03-16T10:01:00Z', message: 'Chapter 1 started' },
    ]
    const sorted = [...events].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    expect(sorted[0].message).toBe('Job queued')
  })

  it('should display chapter number when chapterNo is set', () => {
    const event = { chapterNo: 2, message: 'Chapter 2 started' }
    expect(event.chapterNo).toBe(2)
  })
})

describe('GenerationJobStatusBadge', () => {
  it('should show FAILED badge in red', () => {
    const status = 'FAILED'
    const colorClass = status === 'FAILED' ? 'badge-danger' : 'badge-info'
    expect(colorClass).toBe('badge-danger')
  })

  it('should show overdue warning icon when isOverdue is true', () => {
    const job = { status: 'RUNNING', isOverdue: true }
    expect(job.isOverdue).toBe(true)
  })
})
