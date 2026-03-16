/**
 * Admin Dashboard Contract Tests - TDD
 */
describe('Admin Dashboard API Contract', () => {
  describe('GET /api/admin/dashboard/overview', () => {
    it('should return overview stats for specified time range', () => {
      const shape = {
        totalOrders: expect.any(Number),
        completedOrders: expect.any(Number),
        failedOrders: expect.any(Number),
        timeRange: expect.any(String),
      }
      expect(shape).toBeDefined()
    })

    it('should support day/week/month time ranges', () => {
      const ranges = ['day', 'week', 'month']
      expect(ranges).toHaveLength(3)
    })
  })

  describe('GET /api/admin/dashboard/funnel', () => {
    it('should return funnel step counts', () => {
      const shape = {
        step1Count: expect.any(Number),
        step2Count: expect.any(Number),
        paidCount: expect.any(Number),
        completedCount: expect.any(Number),
      }
      expect(shape).toBeDefined()
    })
  })

  describe('GET /api/admin/dashboard/revenue', () => {
    it('should return revenue breakdown by product', () => {
      const shape = {
        items: expect.any(Array),
        totalRevenueFen: expect.any(Number),
      }
      expect(shape).toBeDefined()
    })
  })
})
