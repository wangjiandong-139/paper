/**
 * ReferenceModule e2e 测试
 *
 * 使用真实 NestJS 应用（内存存储，Mock 外部 HTTP 适配器）。
 * 验证 HTTP 路由、Auth Guard、业务逻辑串联。
 */
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ReferenceModule (e2e)', () => {
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

  const AUTH = { Authorization: 'Bearer test-token' };

  // ── GET /api/references/suggest ───────────────────────────────────────────

  it('GET /api/references/suggest without auth should return 401', async () => {
    await request(app.getHttpServer()).get('/api/references/suggest').expect(401);
  });

  it('GET /api/references/suggest returns items and total', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/references/suggest')
      .query({ subject: '计算机', title: '深度学习', language: 'zh' })
      .set(AUTH)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('GET /api/references/suggest for language=en returns items and total', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/references/suggest')
      .query({ subject: 'CS', title: 'Neural Networks', language: 'en' })
      .set(AUTH)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
  });

  // ── POST /api/references/parse ────────────────────────────────────────────

  it('POST /api/references/parse without auth should return 401', async () => {
    await request(app.getHttpServer())
      .post('/api/references/parse')
      .send({ raw_text: '任意文本' })
      .expect(401);
  });

  it('POST /api/references/parse with valid CNKI citation returns parsed item', async () => {
    const raw_text =
      '[1] 张三,李四.深度学习在自然语言处理中的应用[J].计算机学报,2021,44(3):1-15.';

    const res = await request(app.getHttpServer())
      .post('/api/references/parse')
      .set(AUTH)
      .send({ raw_text })
      .expect(201);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('errors');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.errors).toHaveLength(0);

    const item = res.body.items[0];
    expect(item.title).toBe('深度学习在自然语言处理中的应用');
    expect(item.authors).toContain('张三');
    expect(item.year).toBe(2021);
  });

  it('POST /api/references/parse with invalid citation returns error entry', async () => {
    const raw_text = 'this is not a valid citation at all';

    const res = await request(app.getHttpServer())
      .post('/api/references/parse')
      .set(AUTH)
      .send({ raw_text })
      .expect(201);

    expect(res.body.items).toHaveLength(0);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].line).toBe(1);
  });

  it('POST /api/references/parse with mixed valid/invalid returns both', async () => {
    const raw_text = [
      '[1] 王五.有效文献[J].期刊A,2020.',
      'invalid line',
      '[3] 赵六.另一有效文献[J].期刊B,2021.',
    ].join('\n');

    const res = await request(app.getHttpServer())
      .post('/api/references/parse')
      .set(AUTH)
      .send({ raw_text })
      .expect(201);

    expect(res.body.items).toHaveLength(2);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].line).toBe(2);
  });
});

// ── Draft References Management (in WizardController) ───────────────────────

describe('Draft References Management (e2e)', () => {
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

  const AUTH = { Authorization: 'Bearer test-token' };

  it('POST /api/drafts/:id/references should add reference to draft step2_data', async () => {
    const server = app.getHttpServer();

    const createRes = await request(server)
      .post('/api/drafts')
      .set(AUTH)
      .expect(201);

    const draftId = createRes.body.id as string;

    const ref = {
      id: 'ref-001',
      source: 'USER_INPUT',
      title: '深度学习理论',
      authors: ['张三', '李四'],
      journal: '计算机学报',
      year: 2021,
      raw_citation: '[1] 张三,李四.深度学习理论[J].计算机学报,2021.',
    };

    const addRes = await request(server)
      .post(`/api/drafts/${draftId}/references`)
      .set(AUTH)
      .send(ref)
      .expect(201);

    const refs = (addRes.body.step2_data as { references: unknown[] })?.references;
    expect(Array.isArray(refs)).toBe(true);
    expect(refs).toHaveLength(1);
    expect((refs[0] as { id: string }).id).toBe('ref-001');
  });

  it('DELETE /api/drafts/:id/references/:refId should remove reference', async () => {
    const server = app.getHttpServer();

    const createRes = await request(server)
      .post('/api/drafts')
      .set(AUTH)
      .expect(201);

    const draftId = createRes.body.id as string;

    const ref1 = { id: 'r1', source: 'USER_INPUT', title: 'Title 1', authors: ['A'] };
    const ref2 = { id: 'r2', source: 'USER_INPUT', title: 'Title 2', authors: ['B'] };

    await request(server).post(`/api/drafts/${draftId}/references`).set(AUTH).send(ref1).expect(201);
    await request(server).post(`/api/drafts/${draftId}/references`).set(AUTH).send(ref2).expect(201);

    const delRes = await request(server)
      .delete(`/api/drafts/${draftId}/references/r1`)
      .set(AUTH)
      .expect(200);

    const refs = (delRes.body.step2_data as { references: { id: string }[] })?.references;
    expect(refs).toHaveLength(1);
    expect(refs[0].id).toBe('r2');
  });

  it('POST /api/drafts/:id/references without auth should return 401', async () => {
    await request(app.getHttpServer())
      .post('/api/drafts/any-id/references')
      .send({ id: 'x', source: 'USER_INPUT', title: 'T', authors: [] })
      .expect(401);
  });

  it('多草稿文献互不干扰', async () => {
    const server = app.getHttpServer();

    const [draftA, draftB] = await Promise.all([
      request(server).post('/api/drafts').set(AUTH).expect(201),
      request(server).post('/api/drafts').set(AUTH).expect(201),
    ]);

    const idA = draftA.body.id as string;
    const idB = draftB.body.id as string;

    await request(server)
      .post(`/api/drafts/${idA}/references`)
      .set(AUTH)
      .send({ id: 'refA', source: 'USER_INPUT', title: 'Only in A', authors: [] })
      .expect(201);

    const listA = await request(server).get('/api/drafts').set(AUTH).expect(200);
    const listB = await request(server).get('/api/drafts').set(AUTH).expect(200);

    const foundA = (listA.body as { id: string; step2_data?: { references?: { id: string }[] } }[])
      .find((d) => d.id === idA);
    const foundB = (listB.body as { id: string; step2_data?: { references?: { id: string }[] } }[])
      .find((d) => d.id === idB);

    expect(foundA?.step2_data?.references).toHaveLength(1);
    // B 的 references 不存在或为空
    const bRefs = foundB?.step2_data?.references;
    expect(!bRefs || bRefs.length === 0).toBe(true);
  });
});
