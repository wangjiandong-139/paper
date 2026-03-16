/**
 * OrderService 单元测试
 *
 * 覆盖：创建订单、仅支持 BASIC 套餐、状态流转、支付回调验签与幂等处理、金额防篡改、
 * 重复回调、用户订单隔离。
 */
import { OrderStatus, PlanType } from '../../../packages/shared/src/enums';
import { WechatPaymentAdapter } from '../src/adapters/payment/wechat-payment.adapter';
import { OrderService } from '../src/modules/order/order.service';

// ── helpers ──────────────────────────────────────────────────────────────────

const USER_A = 'user-a';
const USER_B = 'user-b';
const DRAFT_ID = 'draft-001';

function makeAdapter(): jest.Mocked<WechatPaymentAdapter> {
  return {
    createJsapiPay: jest.fn().mockResolvedValue({
      appId: 'wx_test',
      timeStamp: '1700000000',
      nonceStr: 'nonce123',
      package: 'prepay_id=mock_prepay',
      signType: 'RSA',
      paySign: 'mock_sign',
    }),
    createNativePay: jest.fn().mockResolvedValue({
      codeUrl: 'weixin://wxpay/bizpayurl?pr=mock',
    }),
    verifyNotifySignature: jest.fn().mockReturnValue(true),
    decryptNotifyResource: jest.fn(),
  } as unknown as jest.Mocked<WechatPaymentAdapter>;
}

function makeService(adapter?: jest.Mocked<WechatPaymentAdapter>) {
  return new OrderService(adapter ?? makeAdapter());
}

// ── createOrder ───────────────────────────────────────────────────────────────

describe('OrderService – createOrder()', () => {
  it('创建订单后状态应为 PENDING_PAYMENT', async () => {
    const svc = makeService();
    const result = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    const order = await svc.getOrder(USER_A, result.orderId);
    expect(order!.status).toBe(OrderStatus.PENDING_PAYMENT);
  });

  it('创建订单应返回微信支付参数', async () => {
    const svc = makeService();
    const result = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    expect(result.payParams).toBeDefined();
    expect(result.payParams.appId).toBe('wx_test');
    expect(result.payParams.package).toContain('prepay_id=');
  });

  it('创建 BASIC 套餐订单金额应为 9900 分（99 元）', async () => {
    const svc = makeService();
    const result = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    const order = await svc.getOrder(USER_A, result.orderId);
    expect(order!.amount).toBe(9900);
  });

  it('创建订单应分配唯一 orderId', async () => {
    const svc = makeService();
    const r1 = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    const r2 = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    expect(r1.orderId).not.toBe(r2.orderId);
  });

  it('aiRevisionCount 初始值应为 0', async () => {
    const svc = makeService();
    const result = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    const order = await svc.getOrder(USER_A, result.orderId);
    expect(order!.aiRevisionCount).toBe(0);
  });

  it('创建订单应调用 adapter.createJsapiPay 并传入 orderId 和金额', async () => {
    const adapter = makeAdapter();
    const svc = makeService(adapter);
    const result = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    expect(adapter.createJsapiPay).toHaveBeenCalledWith(
      result.orderId,
      9900,
      expect.any(String),
    );
  });
});

// ── listOrders ────────────────────────────────────────────────────────────────

describe('OrderService – listOrders()', () => {
  it('返回当前用户所有订单', async () => {
    const svc = makeService();
    await svc.createOrder(USER_A, { draftId: 'd1', planType: PlanType.BASIC });
    await svc.createOrder(USER_A, { draftId: 'd2', planType: PlanType.BASIC });
    const list = await svc.listOrders(USER_A);
    expect(list).toHaveLength(2);
  });

  it('不同用户的订单相互隔离', async () => {
    const svc = makeService();
    await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    const listB = await svc.listOrders(USER_B);
    expect(listB).toHaveLength(0);
  });

  it('订单列表包含 status、planType、amount、createdAt 字段', async () => {
    const svc = makeService();
    await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    const list = await svc.listOrders(USER_A);
    expect(list[0]).toMatchObject({
      status: OrderStatus.PENDING_PAYMENT,
      planType: PlanType.BASIC,
      amount: 9900,
    });
    expect(list[0].createdAt).toBeInstanceOf(Date);
  });
});

// ── getOrder ──────────────────────────────────────────────────────────────────

describe('OrderService – getOrder()', () => {
  it('存在的订单应返回详情', async () => {
    const svc = makeService();
    const result = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    const order = await svc.getOrder(USER_A, result.orderId);
    expect(order).not.toBeNull();
    expect(order!.draftId).toBe(DRAFT_ID);
  });

  it('其他用户无法访问该订单', async () => {
    const svc = makeService();
    const result = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    const order = await svc.getOrder(USER_B, result.orderId);
    expect(order).toBeNull();
  });

  it('不存在的 orderId 应返回 null', async () => {
    const svc = makeService();
    const order = await svc.getOrder(USER_A, 'ghost-id');
    expect(order).toBeNull();
  });
});

// ── handleWechatNotify ────────────────────────────────────────────────────────

describe('OrderService – handleWechatNotify()', () => {
  it('验签成功且金额匹配时订单应流转为 GENERATING', async () => {
    const adapter = makeAdapter();
    const svc = makeService(adapter);
    const { orderId } = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });

    adapter.decryptNotifyResource.mockResolvedValue({
      out_trade_no: orderId,
      amount: { total: 9900 },
      trade_state: 'SUCCESS',
    });

    const ok = await svc.handleWechatNotify(
      { timestamp: '1700000000', nonce: 'n', body: '{}', signature: 'sig' },
    );
    expect(ok).toBe(true);
    const order = await svc.getOrder(USER_A, orderId);
    expect(order!.status).toBe(OrderStatus.GENERATING);
  });

  it('验签失败时应返回 false，订单状态不变', async () => {
    const adapter = makeAdapter();
    adapter.verifyNotifySignature.mockReturnValue(false);
    const svc = makeService(adapter);
    const { orderId } = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });

    const ok = await svc.handleWechatNotify(
      { timestamp: 't', nonce: 'n', body: '{}', signature: 'bad_sig' },
    );
    expect(ok).toBe(false);
    const order = await svc.getOrder(USER_A, orderId);
    expect(order!.status).toBe(OrderStatus.PENDING_PAYMENT);
  });

  it('金额被篡改时应返回 false，订单状态不变', async () => {
    const adapter = makeAdapter();
    const svc = makeService(adapter);
    const { orderId } = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });

    adapter.decryptNotifyResource.mockResolvedValue({
      out_trade_no: orderId,
      amount: { total: 1 }, // 篡改金额：1 分
      trade_state: 'SUCCESS',
    });

    const ok = await svc.handleWechatNotify(
      { timestamp: 't', nonce: 'n', body: '{}', signature: 'sig' },
    );
    expect(ok).toBe(false);
    const order = await svc.getOrder(USER_A, orderId);
    expect(order!.status).toBe(OrderStatus.PENDING_PAYMENT);
  });

  it('重复回调（幂等）：订单已为 GENERATING 时再次回调应返回 true 且状态不变', async () => {
    const adapter = makeAdapter();
    const svc = makeService(adapter);
    const { orderId } = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });

    adapter.decryptNotifyResource.mockResolvedValue({
      out_trade_no: orderId,
      amount: { total: 9900 },
      trade_state: 'SUCCESS',
    });

    await svc.handleWechatNotify({ timestamp: 't', nonce: 'n', body: '{}', signature: 'sig' });
    const ok2 = await svc.handleWechatNotify({ timestamp: 't', nonce: 'n', body: '{}', signature: 'sig' });
    expect(ok2).toBe(true);
    const order = await svc.getOrder(USER_A, orderId);
    expect(order!.status).toBe(OrderStatus.GENERATING);
  });

  it('重复回调（幂等）：订单已为 COMPLETED 时再次回调应返回 true 且状态不变', async () => {
    const adapter = makeAdapter();
    const svc = makeService(adapter);
    const { orderId } = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });

    adapter.decryptNotifyResource.mockResolvedValue({
      out_trade_no: orderId,
      amount: { total: 9900 },
      trade_state: 'SUCCESS',
    });

    // First callback → GENERATING
    await svc.handleWechatNotify({ timestamp: 't', nonce: 'n', body: '{}', signature: 'sig' });
    // Manually advance to COMPLETED
    await svc.markOrderCompleted(orderId);

    const ok = await svc.handleWechatNotify({ timestamp: 't', nonce: 'n', body: '{}', signature: 'sig' });
    expect(ok).toBe(true);
    const order = await svc.getOrder(USER_A, orderId);
    expect(order!.status).toBe(OrderStatus.COMPLETED);
  });

  it('订单 ID 不存在时回调应返回 false', async () => {
    const adapter = makeAdapter();
    const svc = makeService(adapter);

    adapter.decryptNotifyResource.mockResolvedValue({
      out_trade_no: 'nonexistent-order',
      amount: { total: 9900 },
      trade_state: 'SUCCESS',
    });

    const ok = await svc.handleWechatNotify({ timestamp: 't', nonce: 'n', body: '{}', signature: 'sig' });
    expect(ok).toBe(false);
  });
});

// ── markOrderCompleted / markOrderFailed ──────────────────────────────────────

describe('OrderService – markOrderCompleted() / markOrderFailed()', () => {
  it('markOrderCompleted 将订单置为 COMPLETED', async () => {
    const svc = makeService();
    const { orderId } = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    await svc.markOrderCompleted(orderId);
    const order = await svc.getOrder(USER_A, orderId);
    expect(order!.status).toBe(OrderStatus.COMPLETED);
  });

  it('markOrderFailed 将订单置为 FAILED', async () => {
    const svc = makeService();
    const { orderId } = await svc.createOrder(USER_A, { draftId: DRAFT_ID, planType: PlanType.BASIC });
    await svc.markOrderFailed(orderId);
    const order = await svc.getOrder(USER_A, orderId);
    expect(order!.status).toBe(OrderStatus.FAILED);
  });

  it('不存在的 orderId 调用 markOrderCompleted 应抛出错误', async () => {
    const svc = makeService();
    await expect(svc.markOrderCompleted('ghost')).rejects.toThrow();
  });
});
