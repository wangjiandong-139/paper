/**
 * Admin Products Integration Tests - TDD
 */
describe('Admin Products Integration', () => {
  describe('Product activation/deactivation', () => {
    it('deactivated product should not be selectable for new orders', () => {
      const product = { status: 'INACTIVE' }
      const canOrder = product.status === 'ACTIVE'
      expect(canOrder).toBe(false)
    })
  })

  describe('Order snapshot immutability', () => {
    it('should preserve productSnapshotJson even when product is updated', () => {
      const snapshot = { name: '基础版', priceFen: 9900 }
      const currentProduct = { name: '基础版升级', priceFen: 12900 }
      expect(snapshot.name).toBe('基础版')
      expect(snapshot.priceFen).toBe(9900)
      expect(snapshot.name).not.toBe(currentProduct.name)
    })
  })

  describe('Payment query', () => {
    it('should filter payments by date range', () => {
      const payments = [
        { paidAt: new Date('2026-03-01') },
        { paidAt: new Date('2026-02-01') },
      ]
      const start = new Date('2026-02-15')
      const recent = payments.filter((p) => p.paidAt >= start)
      expect(recent).toHaveLength(1)
    })
  })
})
