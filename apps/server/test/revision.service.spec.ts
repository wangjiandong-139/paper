/**
 * RevisionService 单元测试
 *
 * 覆盖：手动内容保存、AI 改稿次数计数（计入/不计入类型）、
 * 达到上限返回 403、引用核对可追溯/不可追溯识别。
 */
import { ForbiddenException } from '@nestjs/common';
import { PlanType, RevisionType } from '../../../packages/shared/src/enums';
import { ReferenceItem } from '../../../packages/shared/src/types';
import { IAiAdapter } from '../src/adapters/ai/ai.adapter.interface';
import { OrderService } from '../src/modules/order/order.service';
import { WechatPaymentAdapter } from '../src/adapters/payment/wechat-payment.adapter';
import { RevisionService } from '../src/modules/revision/revision.service';

// ── helpers ──────────────────────────────────────────────────────────────────

const USER_A = 'user-a';

function makePaymentAdapter(): jest.Mocked<WechatPaymentAdapter> {
  return {
    createJsapiPay: jest.fn().mockResolvedValue({ appId: 'wx', timeStamp: '0', nonceStr: 'n', package: 'prepay_id=x', signType: 'RSA', paySign: 's' }),
    createNativePay: jest.fn(),
    verifyNotifySignature: jest.fn(),
    decryptNotifyResource: jest.fn(),
  } as unknown as jest.Mocked<WechatPaymentAdapter>;
}

function makeAiAdapter(chunks: string[] = ['revised content']): jest.Mocked<IAiAdapter> {
  async function* mockStream() {
    for (const chunk of chunks) yield chunk;
  }
  return {
    completion: jest.fn().mockResolvedValue(chunks.join('')),
    streamCompletion: jest.fn().mockReturnValue(mockStream()),
  } as unknown as jest.Mocked<IAiAdapter>;
}

function makeServices(aiChunks?: string[]) {
  const payAdapter = makePaymentAdapter();
  const orderSvc = new OrderService(payAdapter);
  const aiAdapter = makeAiAdapter(aiChunks);
  const revSvc = new RevisionService(orderSvc, aiAdapter);
  return { orderSvc, aiAdapter, revSvc };
}

async function createGeneratingOrder(orderSvc: OrderService): Promise<string> {
  const payAdapter = makePaymentAdapter();
  payAdapter.decryptNotifyResource = jest.fn().mockResolvedValue({
    out_trade_no: '',
    amount: { total: 9900 },
    trade_state: 'SUCCESS',
  });

  const { orderId } = await orderSvc.createOrder(USER_A, { draftId: 'd1', planType: PlanType.BASIC });
  // patch the mock to return correct orderId
  (payAdapter.decryptNotifyResource as jest.Mock).mockResolvedValue({
    out_trade_no: orderId,
    amount: { total: 9900 },
    trade_state: 'SUCCESS',
  });
  await orderSvc.handleWechatNotify({ timestamp: 't', nonce: 'n', body: '{}', signature: 'sig' });
  return orderId;
}

const REFS: ReferenceItem[] = [
  { id: 'r1', source: 'CNKI' as never, title: '深度学习综述', authors: ['张三'], year: 2022 },
  { id: 'r2', source: 'CNKI' as never, title: 'Transformer', authors: ['Vaswani'], year: 2017 },
  { id: 'r3', source: 'CNKI' as never, title: '自然语言处理', authors: ['李四'], year: 2021 },
];

// ── saveContent ───────────────────────────────────────────────────────────────

describe('RevisionService – saveContent()', () => {
  it('保存内容后可通过 getContent 读回', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '<p>论文内容</p>');
    const content = await revSvc.getContent(USER_A, orderId);
    expect(content).toBe('<p>论文内容</p>');
  });

  it('其他用户无法读取内容', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '内容');
    const content = await revSvc.getContent('user-b', orderId);
    expect(content).toBeNull();
  });

  it('不存在的 orderId 保存内容应抛出异常', async () => {
    const { revSvc } = makeServices();
    await expect(revSvc.saveContent(USER_A, 'ghost-order', '内容')).rejects.toThrow();
  });

  it('多次保存应覆盖旧内容', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '旧内容');
    await revSvc.saveContent(USER_A, orderId, '新内容');
    expect(await revSvc.getContent(USER_A, orderId)).toBe('新内容');
  });
});

// ── AI 改稿次数计数 ────────────────────────────────────────────────────────────

describe('RevisionService – AI 改稿次数计数', () => {
  const COUNTED_TYPES: RevisionType[] = [
    RevisionType.REWRITE,
    RevisionType.REDUCE_PLAGIARISM,
    RevisionType.REDUCE_AI,
    RevisionType.EXPAND,
    RevisionType.SHRINK,
    RevisionType.POLISH,
  ];

  it.each(COUNTED_TYPES)('%s 应计入改稿次数', async (type) => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '原始内容，引用[1]部分');
    await revSvc.requestAiRevision(USER_A, orderId, type, undefined, REFS);
    const order = await orderSvc.getOrder(USER_A, orderId);
    expect(order!.aiRevisionCount).toBe(1);
  });

  it('BASIC 套餐使用 3 次后应抛出 ForbiddenException', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '原始内容');
    for (let i = 0; i < 3; i++) {
      await revSvc.requestAiRevision(USER_A, orderId, RevisionType.POLISH, undefined, REFS);
    }
    await expect(
      revSvc.requestAiRevision(USER_A, orderId, RevisionType.POLISH, undefined, REFS)
    ).rejects.toThrow(ForbiddenException);
  });

  it('第 3 次改稿应成功，第 4 次应抛出 ForbiddenException', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '内容');

    for (let i = 0; i < 2; i++) {
      await revSvc.requestAiRevision(USER_A, orderId, RevisionType.REWRITE, undefined, REFS);
    }
    // Third should succeed
    await expect(
      revSvc.requestAiRevision(USER_A, orderId, RevisionType.REWRITE, undefined, REFS)
    ).resolves.not.toThrow();

    // Fourth should fail
    await expect(
      revSvc.requestAiRevision(USER_A, orderId, RevisionType.REWRITE, undefined, REFS)
    ).rejects.toThrow(ForbiddenException);
  });
});

// ── requestAiRevision 流式输出 ─────────────────────────────────────────────────

describe('RevisionService – requestAiRevision() 流式输出', () => {
  it('应返回 AsyncIterable（流式结果）', async () => {
    const { orderSvc, revSvc } = makeServices(['chunk1', ' chunk2']);
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '原始内容');
    const stream = await revSvc.requestAiRevision(USER_A, orderId, RevisionType.POLISH, undefined, REFS);
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('chunk1');
  });

  it('AI 适配器应收到包含原始内容和 RevisionType 的提示词', async () => {
    const { orderSvc, aiAdapter, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '原始段落内容');
    const stream = await revSvc.requestAiRevision(USER_A, orderId, RevisionType.EXPAND, undefined, REFS);
    for await (const _ of stream) { /* drain */ }
    const callArg: string = (aiAdapter.streamCompletion as jest.Mock).mock.calls[0][0] as string;
    expect(callArg).toContain('原始段落内容');
  });
});

// ── checkCitations ────────────────────────────────────────────────────────────

describe('RevisionService – checkCitations()', () => {
  it('内容无引用时 traceable 和 untraceable 均为空', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '这是一段没有引用的文字。');
    const result = await revSvc.checkCitations(USER_A, orderId, REFS);
    expect(result.traceable).toHaveLength(0);
    expect(result.untraceable).toHaveLength(0);
  });

  it('引用 [1] 在文献列表内应归为 traceable', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '深度学习已被广泛应用[1]，并在多领域取得进展[2]。');
    const result = await revSvc.checkCitations(USER_A, orderId, REFS);
    expect(result.traceable.some((c) => c.text.includes('[1]'))).toBe(true);
    expect(result.traceable.every((c) => c.traceable)).toBe(true);
  });

  it('引用超出文献列表范围（如 [99]）应归为 untraceable', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '某研究表明[99]该方法有效。');
    const result = await revSvc.checkCitations(USER_A, orderId, REFS);
    expect(result.untraceable.some((c) => c.text.includes('[99]'))).toBe(true);
    expect(result.untraceable[0].traceable).toBe(false);
  });

  it('引用核对结果包含 traceable 和 untraceable 字段', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    await revSvc.saveContent(USER_A, orderId, '研究[1]表明[5]有效。');
    const result = await revSvc.checkCitations(USER_A, orderId, REFS);
    expect(result).toHaveProperty('traceable');
    expect(result).toHaveProperty('untraceable');
  });

  it('未保存内容时引用核对应返回空结果', async () => {
    const { orderSvc, revSvc } = makeServices();
    const orderId = await createGeneratingOrder(orderSvc);
    const result = await revSvc.checkCitations(USER_A, orderId, REFS);
    expect(result.traceable).toHaveLength(0);
    expect(result.untraceable).toHaveLength(0);
  });
});
