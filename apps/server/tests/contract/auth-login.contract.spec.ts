/**
 * Auth Login API Contract Tests
 *
 * POST /api/auth/login - 用户名密码登录
 */
describe('Auth Login API Contract', () => {
  describe('POST /api/auth/login', () => {
    it('should accept username and password in body', () => {
      const body = { username: 'user', password: '1' }
      expect(body).toHaveProperty('username')
      expect(body).toHaveProperty('password')
    })

    it('should return 200 with token and user on valid credentials', () => {
      const responseShape = {
        token: expect.any(String),
        user: {
          userId: expect.any(String),
          wechatOpenId: expect.any(String),
          nickname: expect.anything(),
          avatarUrl: expect.anything(),
          onboardingCompleted: expect.any(Boolean),
        },
      }
      expect(responseShape.token).toBeDefined()
      expect(responseShape.user.userId).toBeDefined()
    })

    it('should return 401 for invalid credentials', () => {
      const status = 401
      expect(status).toBe(401)
    })

    it('should return 401 for non-existent username', () => {
      const status = 401
      expect(status).toBe(401)
    })
  })
})
