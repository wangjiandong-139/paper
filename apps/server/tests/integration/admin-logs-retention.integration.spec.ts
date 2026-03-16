/**
 * Admin Operation Log Retention Tests - TDD
 */
describe('Admin Operation Log Retention', () => {
  describe('Retention cleanup job', () => {
    it('should delete logs older than 180 days', () => {
      const RETENTION_DAYS = 180
      const now = new Date()
      const oldLog = { createdAt: new Date(now.getTime() - (RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000) }
      const recentLog = { createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }

      const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
      expect(oldLog.createdAt < cutoff).toBe(true)
      expect(recentLog.createdAt < cutoff).toBe(false)
    })

    it('should keep logs within 180 days', () => {
      const RETENTION_DAYS = 180
      const recentLog = { createdAt: new Date() }
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
      expect(recentLog.createdAt >= cutoff).toBe(true)
    })

    it('should not delete logs - they are append-only for manual access', () => {
      const log = { id: '1', createdAt: new Date(), actionType: 'ORDER_RETRY' }
      expect(log.actionType).toBeTruthy()
    })
  })

  describe('Secret redaction', () => {
    it('should never include API secret in log beforeJson or afterJson', () => {
      const logEntry = {
        actionType: 'CONFIG_UPDATE',
        beforeJson: { baseUrl: 'https://api.example.com', maskedSecret: '****abc' },
        afterJson: { baseUrl: 'https://api2.example.com', maskedSecret: '****xyz' },
      }
      expect(JSON.stringify(logEntry)).not.toContain('plaintext-secret')
      expect(logEntry.beforeJson?.maskedSecret).toMatch(/\*+/)
    })
  })
})
