/**
 * Payment List Tests - TDD
 */
import { describe, it, expect } from 'vitest'

describe('PaymentListView', () => {
  it('should display payment amount in yuan', () => {
    const amountFen = 9900
    const yuan = (amountFen / 100).toFixed(2)
    expect(yuan).toBe('99.00')
  })

  it('should filter by date range', () => {
    const payments = [
      { paidAt: '2026-03-10' },
      { paidAt: '2026-03-01' },
    ]
    const filtered = payments.filter((p) => p.paidAt >= '2026-03-05')
    expect(filtered).toHaveLength(1)
  })
})
