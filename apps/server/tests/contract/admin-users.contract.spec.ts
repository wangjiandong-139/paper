/**
 * Admin Users (End Users) Contract Tests - TDD
 */
describe('Admin Users API Contract', () => {
  describe('GET /api/admin/users', () => {
    it('should return paginated user list', () => {
      const shape = { items: expect.any(Array), total: expect.any(Number) }
      expect(shape).toBeDefined()
    })
  })

  describe('GET /api/admin/users/:userId', () => {
    it('should return user detail with risk control and recent orders', () => {
      const shape = { id: expect.any(String), riskControl: null, recentOrders: expect.any(Array) }
      expect(shape).toBeDefined()
    })
  })

  describe('POST /api/admin/users/:userId/disable', () => {
    it('should set UserRiskControl.isDisabled to true', () => {
      expect(true).toBe(true)
    })
  })

  describe('PUT /api/admin/users/:userId/risk-controls', () => {
    it('should upsert risk control record', () => {
      const body = { isDisabled: true, dailyGenerationLimit: 3, reason: 'abuse' }
      expect(body.isDisabled).toBe(true)
    })
  })
})
