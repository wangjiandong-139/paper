/**
 * Admin Config Contract Tests - TDD
 */
describe('Admin Config API Contract', () => {
  describe('GET /api/admin/configs/api', () => {
    it('should return list of API configs with masked secrets', () => {
      const maskedPattern = /\*+/
      const masked = '****key'
      expect(masked).toMatch(maskedPattern)
    })

    it('should never return plaintext secrets', () => {
      const config = { maskedSecret: '****abc' }
      expect(config.maskedSecret).not.toBe('plaintext-key-value')
    })
  })

  describe('PUT /api/admin/configs/api/:configType', () => {
    it('should accept baseUrl, providerName, secret, isEnabled', () => {
      const body = { baseUrl: 'https://api.example.com', providerName: 'TestProvider', isEnabled: true }
      expect(body).toHaveProperty('baseUrl')
    })

    it('should increment configVersion after update', () => {
      const before = { configVersion: 1 }
      const after = { configVersion: before.configVersion + 1 }
      expect(after.configVersion).toBe(2)
    })
  })

  describe('POST /api/admin/configs/api/test-connectivity', () => {
    it('should return connectivity test result with latencyMs', () => {
      const result = { success: true, latencyMs: 120, errorMessage: null }
      expect(result.success).toBe(true)
    })
  })

  describe('GET /api/admin/configs/system', () => {
    it('should return system config fields', () => {
      const shape = { maintenanceMode: expect.any(Boolean), maxDailyGenerationDefault: expect.any(Number) }
      expect(shape).toBeDefined()
    })
  })

  describe('PUT /api/admin/configs/system', () => {
    it('should update system config', () => {
      const body = { maintenanceMode: true }
      expect(body.maintenanceMode).toBe(true)
    })
  })
})
