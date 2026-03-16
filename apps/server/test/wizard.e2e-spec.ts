import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('WizardModule / Drafts (e2e)', () => {
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

  it('GET /api/drafts without auth should return 401', async () => {
    await request(app.getHttpServer()).get('/api/drafts').expect(401);
  });

  it('should support CRUD and step persistence for drafts for the same user', async () => {
    const server = app.getHttpServer();
    const token = 'test-token';

    const listRes = await request(server)
      .get('/api/drafts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);

    const createRes = await request(server)
      .post('/api/drafts')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(createRes.body).toHaveProperty('id');
    const draftId = createRes.body.id as string;

    const step1Payload = { title: 'Title 1', subject: 'CS' };
    const step1Res = await request(server)
      .patch(`/api/drafts/${draftId}/step/1`)
      .set('Authorization', `Bearer ${token}`)
      .send(step1Payload)
      .expect(200);

    expect(step1Res.body.step1_data).toEqual(step1Payload);
    expect(step1Res.body.current_step).toBeGreaterThanOrEqual(1);

    const step2Payload = { references: [{ id: 1 }] };
    const step2Res = await request(server)
      .patch(`/api/drafts/${draftId}/step/2`)
      .set('Authorization', `Bearer ${token}`)
      .send(step2Payload)
      .expect(200);

    expect(step2Res.body.step2_data).toEqual(step2Payload);
    expect(step2Res.body.current_step).toBeGreaterThanOrEqual(2);

    const listAfterUpdates = await request(server)
      .get('/api/drafts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const found = (listAfterUpdates.body as any[]).find((d) => d.id === draftId);
    expect(found).toBeDefined();
    expect(found.step1_data).toEqual(step1Payload);
    expect(found.step2_data).toEqual(step2Payload);

    await request(server)
      .delete(`/api/drafts/${draftId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const listAfterDelete = await request(server)
      .get('/api/drafts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const deletedFound = (listAfterDelete.body as any[]).find((d) => d.id === draftId);
    expect(deletedFound).toBeUndefined();
  });
}
);

