/**
 * AuthService 单元测试
 *
 * 覆盖：密码哈希与校验工具（hashPassword、verifyPassword）
 */
import { AuthService } from '../src/modules/auth/auth.service'

function makeService(): AuthService {
  return new AuthService({} as never)
}

describe('AuthService - password hash and verify', () => {
  describe('hashPassword', () => {
    it('应返回非空哈希字符串', async () => {
      const service = makeService()
      const hash = await service.hashPassword('plain')
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
      expect(hash).not.toBe('plain')
    })

    it('相同明文应产生不同哈希（因 salt 不同）', async () => {
      const service = makeService()
      const h1 = await service.hashPassword('test')
      const h2 = await service.hashPassword('test')
      expect(h1).not.toBe(h2)
    })
  })

  describe('verifyPassword', () => {
    it('正确密码应校验通过', async () => {
      const service = makeService()
      const hash = await service.hashPassword('secret')
      const ok = await service.verifyPassword('secret', hash)
      expect(ok).toBe(true)
    })

    it('错误密码应校验失败', async () => {
      const service = makeService()
      const hash = await service.hashPassword('secret')
      const ok = await service.verifyPassword('wrong', hash)
      expect(ok).toBe(false)
    })
  })
})
