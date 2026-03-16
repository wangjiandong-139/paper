import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../src/common/jwt-auth.guard';

function createMockContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    // 以下属性在本测试中不会用到，返回占位值即可
    getClass: () => (class Dummy {}) as never,
    getHandler: () => ((): void => undefined) as never,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({} as never),
    switchToWs: () => ({} as never),
    getType: () => 'http',
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();

  it('should throw for missing Authorization header', () => {
    const ctx = createMockContext({});
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('should throw for invalid Authorization header', () => {
    const ctx = createMockContext({ authorization: 'Token abc' });
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('should pass for Bearer token header', () => {
    const ctx = createMockContext({ authorization: 'Bearer test-token' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

