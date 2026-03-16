/**
 * GenerationWorkerService + GenerationQueueService 单元测试
 *
 * 覆盖：按章生成顺序、引用注入到提示词、进度事件格式、
 * AI 失败重试、全部失败后标记 FAILED、队列入队/出队。
 */
import { ChapterStatus, OrderStatus } from '../../../packages/shared/src/enums';
import { OutlineNode, ReferenceItem } from '../../../packages/shared/src/types';
import { IAiAdapter } from '../src/adapters/ai/ai.adapter.interface';
import { GenerationProgressService } from '../src/modules/generation/generation-progress.service';
import { GenerationQueueService } from '../src/modules/generation/generation-queue.service';
import { GenerationJobData, GenerationWorkerService } from '../src/modules/generation/generation-worker.service';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeAiAdapter(content = 'Generated content'): jest.Mocked<IAiAdapter> {
  return {
    completion: jest.fn().mockResolvedValue(content),
    streamCompletion: jest.fn(),
  } as unknown as jest.Mocked<IAiAdapter>;
}

function makeWorker(ai?: jest.Mocked<IAiAdapter>) {
  const progressSvc = new GenerationProgressService();
  const adapter = ai ?? makeAiAdapter();
  const worker = new GenerationWorkerService(adapter, progressSvc);
  return { worker, progressSvc, adapter };
}

const SIMPLE_OUTLINE: OutlineNode[] = [
  { id: '1', title: '第一章 绪论', level: 1, word_count: 2000, children: [] },
  { id: '2', title: '第二章 文献综述', level: 1, word_count: 3000, children: [] },
  { id: '3', title: '第三章 研究方法', level: 1, word_count: 3000, children: [] },
];

const REFS: ReferenceItem[] = [
  { id: 'r1', source: 'CNKI' as never, title: '深度学习综述', authors: ['张三', '李四'], year: 2023 },
  { id: 'r2', source: 'CNKI' as never, title: 'Transformer Architecture', authors: ['Vaswani'], year: 2017 },
];

function makeJob(overrides: Partial<GenerationJobData> = {}): GenerationJobData {
  return {
    orderId: 'order-test',
    outline: SIMPLE_OUTLINE,
    references: REFS,
    totalWordCount: 8000,
    paperTitle: '基于深度学习的论文自动生成研究',
    subject: '计算机科学',
    ...overrides,
  };
}

// ── GenerationWorkerService – processJob ─────────────────────────────────────

describe('GenerationWorkerService – processJob()', () => {
  it('应按提纲顺序逐章调用 AI（调用次数 = 顶层章节数）', async () => {
    const { worker, adapter } = makeWorker();
    await worker.processJob(makeJob());
    expect(adapter.completion).toHaveBeenCalledTimes(3);
  });

  it('生成结果应按顺序保存为 chapters，顺序与 outline 一致', async () => {
    const { worker } = makeWorker();
    await worker.processJob(makeJob());
    const chapters = worker.getChapters('order-test');
    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe('第一章 绪论');
    expect(chapters[1].title).toBe('第二章 文献综述');
    expect(chapters[2].title).toBe('第三章 研究方法');
  });

  it('生成成功后各章节状态应为 DONE', async () => {
    const { worker } = makeWorker();
    await worker.processJob(makeJob());
    const chapters = worker.getChapters('order-test');
    expect(chapters.every((c) => c.status === ChapterStatus.DONE)).toBe(true);
  });

  it('生成内容应写入 chapter.content', async () => {
    const { worker } = makeWorker(makeAiAdapter('mock chapter text'));
    await worker.processJob(makeJob());
    const chapters = worker.getChapters('order-test');
    expect(chapters[0].content).toBe('mock chapter text');
  });

  it('processJob 完成后应返回最终状态 COMPLETED', async () => {
    const { worker } = makeWorker();
    const result = await worker.processJob(makeJob());
    expect(result.finalStatus).toBe(OrderStatus.COMPLETED);
  });
});

// ── GenerationWorkerService – 引用注入 ────────────────────────────────────────

describe('GenerationWorkerService – 引用注入', () => {
  it('生成提示词应包含文献标题', async () => {
    const { worker, adapter } = makeWorker();
    await worker.processJob(makeJob());
    const userPrompt: string = adapter.completion.mock.calls[0][0] as string;
    expect(userPrompt).toContain('深度学习综述');
    expect(userPrompt).toContain('Transformer Architecture');
  });

  it('生成提示词应包含章节标题', async () => {
    const { worker, adapter } = makeWorker();
    await worker.processJob(makeJob());
    const userPrompt: string = adapter.completion.mock.calls[0][0] as string;
    expect(userPrompt).toContain('第一章 绪论');
  });

  it('生成提示词应包含目标字数', async () => {
    const { worker, adapter } = makeWorker();
    await worker.processJob(makeJob());
    const userPrompt: string = adapter.completion.mock.calls[0][0] as string;
    expect(userPrompt).toContain('2000');
  });
});

// ── GenerationWorkerService – 进度事件 ───────────────────────────────────────

describe('GenerationWorkerService – 进度事件', () => {
  it('每章完成后应发出一个进度事件', async () => {
    const { worker, progressSvc } = makeWorker();
    const events: unknown[] = [];
    progressSvc.on('progress', (e) => events.push(e));

    await worker.processJob(makeJob());
    expect(events).toHaveLength(3);
  });

  it('进度事件应包含 order_id、total_chapters、completed_chapters', async () => {
    const { worker, progressSvc } = makeWorker();
    const events: Array<{ order_id: string; total_chapters: number; completed_chapters: number }> = [];
    progressSvc.on('progress', (e) => events.push(e as never));

    await worker.processJob(makeJob());
    expect(events[0].order_id).toBe('order-test');
    expect(events[0].total_chapters).toBe(3);
    expect(events[0].completed_chapters).toBe(1);
    expect(events[2].completed_chapters).toBe(3);
  });

  it('完成事件的 status 应为 COMPLETED', async () => {
    const { worker, progressSvc } = makeWorker();
    const events: Array<{ status: OrderStatus; completed_chapters: number }> = [];
    progressSvc.on('progress', (e) => events.push(e as never));

    await worker.processJob(makeJob());
    const last = events[events.length - 1];
    expect(last.status).toBe(OrderStatus.COMPLETED);
  });
});

// ── GenerationWorkerService – 失败重试 ────────────────────────────────────────

describe('GenerationWorkerService – 失败重试（15.7）', () => {
  it('AI 调用失败后重试，最终成功时章节状态应为 DONE', async () => {
    const adapter = makeAiAdapter();
    adapter.completion
      .mockRejectedValueOnce(new Error('AI timeout'))
      .mockResolvedValue('success after retry');

    const { worker } = makeWorker(adapter);
    const result = await worker.processJob(makeJob({ outline: [SIMPLE_OUTLINE[0]] }));
    expect(result.finalStatus).toBe(OrderStatus.COMPLETED);
    const chapters = worker.getChapters('order-test');
    expect(chapters[0].status).toBe(ChapterStatus.DONE);
  });

  it('超过最大重试次数（3次）后，jobResult.finalStatus 应为 FAILED', async () => {
    const adapter = makeAiAdapter();
    adapter.completion.mockRejectedValue(new Error('persistent AI error'));

    const { worker } = makeWorker(adapter);
    const result = await worker.processJob(makeJob({ outline: [SIMPLE_OUTLINE[0]] }));
    expect(result.finalStatus).toBe(OrderStatus.FAILED);
    const chapters = worker.getChapters('order-test');
    expect(chapters[0].status).toBe(ChapterStatus.FAILED);
  });

  it('超过最大重试次数后 AI 应被调用 MAX_RETRIES+1 次', async () => {
    const adapter = makeAiAdapter();
    adapter.completion.mockRejectedValue(new Error('error'));

    const { worker } = makeWorker(adapter);
    await worker.processJob(makeJob({ outline: [SIMPLE_OUTLINE[0]] }));
    expect(adapter.completion).toHaveBeenCalledTimes(GenerationWorkerService.MAX_RETRIES + 1);
  });

  it('第一章失败后其余章节不再生成（快速失败）', async () => {
    const adapter = makeAiAdapter();
    adapter.completion.mockRejectedValue(new Error('error'));

    const { worker } = makeWorker(adapter);
    await worker.processJob(makeJob());
    const chapters = worker.getChapters('order-test');
    // Only one chapter attempted (first one, which failed)
    expect(chapters.filter((c) => c.status === ChapterStatus.FAILED)).toHaveLength(1);
  });
});

// ── GenerationQueueService ────────────────────────────────────────────────────

describe('GenerationQueueService', () => {
  it('入队后 size 应增加', () => {
    const queue = new GenerationQueueService();
    expect(queue.size).toBe(0);
    queue.enqueue(makeJob());
    expect(queue.size).toBe(1);
  });

  it('dequeue 应返回最早入队的任务（FIFO）', () => {
    const queue = new GenerationQueueService();
    queue.enqueue(makeJob({ orderId: 'first' }));
    queue.enqueue(makeJob({ orderId: 'second' }));
    const job = queue.dequeue();
    expect(job?.orderId).toBe('first');
  });

  it('dequeue 空队列应返回 undefined', () => {
    const queue = new GenerationQueueService();
    expect(queue.dequeue()).toBeUndefined();
  });

  it('同一 orderId 重复入队应只保留一个（幂等）', () => {
    const queue = new GenerationQueueService();
    queue.enqueue(makeJob({ orderId: 'dup' }));
    queue.enqueue(makeJob({ orderId: 'dup' }));
    expect(queue.size).toBe(1);
  });

  it('dequeue 后 size 应减少', () => {
    const queue = new GenerationQueueService();
    queue.enqueue(makeJob());
    queue.dequeue();
    expect(queue.size).toBe(0);
  });
});

// ── GenerationProgressService ─────────────────────────────────────────────────

describe('GenerationProgressService', () => {
  it('getLatestProgress 在无进度时返回 null', () => {
    const svc = new GenerationProgressService();
    expect(svc.getLatestProgress('unknown-order')).toBeNull();
  });

  it('发出 progress 事件后 getLatestProgress 应返回最新状态', async () => {
    const { worker, progressSvc } = makeWorker();
    await worker.processJob(makeJob({ outline: [SIMPLE_OUTLINE[0]] }));
    const latest = progressSvc.getLatestProgress('order-test');
    expect(latest).not.toBeNull();
    expect(latest!.completed_chapters).toBe(1);
  });
});
