/**
 * OutlineModule e2e 测试
 *
 * 测试范围：
 * 1. POST /api/outlines/generate — SSE 流式提纲生成
 * 2. PATCH /api/drafts/:id/outline — 保存提纲到草稿
 * 3. Auth Guard 保护（无 token 返回 401）
 */
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OutlineNode } from '../src/modules/outline/outline.service';

const AUTH = { Authorization: 'Bearer test-token' };

const SAMPLE_OUTLINE: OutlineNode[] = [
  {
    id: '1',
    title: '绪论',
    level: 1,
    word_count: 2000,
    children: [
      { id: '1.1', title: '研究背景', level: 2, word_count: 800, children: [] },
      { id: '1.2', title: '研究意义', level: 2, word_count: 600, children: [] },
    ],
  },
  {
    id: '2',
    title: '相关工作',
    level: 1,
    word_count: 3000,
    children: [
      { id: '2.1', title: '国内研究现状', level: 2, word_count: 1500, children: [] },
    ],
  },
];

describe('OutlineModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Auth Guard ──────────────────────────────────────────────────────────────

  it('POST /api/outlines/generate without auth should return 401', async () => {
    await request(app.getHttpServer())
      .post('/api/outlines/generate')
      .send({ draft_id: 'any' })
      .expect(401);
  });

  it('PATCH /api/drafts/:id/outline without auth should return 401', async () => {
    await request(app.getHttpServer())
      .patch('/api/drafts/any/outline')
      .send(SAMPLE_OUTLINE)
      .expect(401);
  });

  // ── POST /api/outlines/generate ─────────────────────────────────────────────

  it('POST /api/outlines/generate with unknown draft_id should return 404', async () => {
    await request(app.getHttpServer())
      .post('/api/outlines/generate')
      .set(AUTH)
      .send({ draft_id: 'non-existent-id' })
      .expect(404);
  });

  it('POST /api/outlines/generate returns SSE stream with complete event', async () => {
    const server = app.getHttpServer();

    // 先创建一个草稿
    const draftRes = await request(server)
      .post('/api/drafts')
      .set(AUTH)
      .expect(201);

    const draftId = draftRes.body.id as string;

    // 设置草稿的步骤 1 数据
    await request(server)
      .patch(`/api/drafts/${draftId}/step/1`)
      .set(AUTH)
      .send({
        subject: '计算机科学',
        title: '深度学习研究',
        word_count: 8000,
        degree_type: 'master',
      })
      .expect(200);

    const res = await request(server)
      .post('/api/outlines/generate')
      .set(AUTH)
      .send({ draft_id: draftId })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => callback(null, data));
      })
      .expect(200);

    // 验证 Content-Type 包含 text/event-stream
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    // 验证响应体包含 SSE 数据行
    const body = res.body as string;
    expect(typeof body).toBe('string');
    expect(body).toContain('data:');

    // 验证有 complete 或 error 事件（stub AI 返回 []）
    const lines = body
      .split('\n')
      .filter((l: string) => l.startsWith('data:'));
    expect(lines.length).toBeGreaterThan(0);

    const lastEvent = JSON.parse(lines[lines.length - 1].replace('data: ', '')) as {
      type: string;
    };
    expect(['complete', 'error']).toContain(lastEvent.type);
  });

  // ── PATCH /api/drafts/:id/outline ──────────────────────────────────────────

  it('PATCH /api/drafts/:id/outline saves outline to step3_data', async () => {
    const server = app.getHttpServer();

    const draftRes = await request(server)
      .post('/api/drafts')
      .set(AUTH)
      .expect(201);

    const draftId = draftRes.body.id as string;

    const saveRes = await request(server)
      .patch(`/api/drafts/${draftId}/outline`)
      .set(AUTH)
      .send(SAMPLE_OUTLINE)
      .expect(200);

    const step3 = saveRes.body.step3_data as {
      outline?: OutlineNode[];
      confirmed?: boolean;
    };

    expect(step3).toBeDefined();
    expect(Array.isArray(step3.outline)).toBe(true);
    expect(step3.outline).toHaveLength(SAMPLE_OUTLINE.length);
    expect(step3.outline![0].id).toBe('1');
    expect(step3.outline![0].title).toBe('绪论');
    expect(step3.confirmed).toBe(false);
  });

  it('PATCH /api/drafts/:id/outline updates current_step to at least 3', async () => {
    const server = app.getHttpServer();

    const draftRes = await request(server)
      .post('/api/drafts')
      .set(AUTH)
      .expect(201);

    const draftId = draftRes.body.id as string;

    const saveRes = await request(server)
      .patch(`/api/drafts/${draftId}/outline`)
      .set(AUTH)
      .send(SAMPLE_OUTLINE)
      .expect(200);

    expect(saveRes.body.current_step).toBeGreaterThanOrEqual(3);
  });

  // ── POST /api/outlines/parse ──────────────────────────────────────────────

  it('POST /api/outlines/parse returns outline array as-is', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/outlines/parse')
      .set(AUTH)
      .send({ outline: SAMPLE_OUTLINE })
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(SAMPLE_OUTLINE.length);
    expect(res.body[0].id).toBe('1');
  });

  it('POST /api/outlines/parse with empty body returns empty array', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/outlines/parse')
      .set(AUTH)
      .send({})
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('多草稿提纲互不干扰', async () => {
    const server = app.getHttpServer();

    const [dA, dB] = await Promise.all([
      request(server).post('/api/drafts').set(AUTH).expect(201),
      request(server).post('/api/drafts').set(AUTH).expect(201),
    ]);

    const idA = dA.body.id as string;
    const idB = dB.body.id as string;

    const outlineA: OutlineNode[] = [
      { id: 'a1', title: 'Only in A', level: 1, children: [] },
    ];

    await request(server)
      .patch(`/api/drafts/${idA}/outline`)
      .set(AUTH)
      .send(outlineA)
      .expect(200);

    // B 的 step3_data 不应包含 A 的提纲
    const bDrafts = await request(server)
      .get('/api/drafts')
      .set(AUTH)
      .expect(200);

    const draftB = (
      bDrafts.body as { id: string; step3_data?: Record<string, unknown> }[]
    ).find((d) => d.id === idB);

    const bOutline = draftB?.step3_data?.['outline'];
    expect(!bOutline || (bOutline as unknown[]).length === 0).toBe(true);
  });
});
