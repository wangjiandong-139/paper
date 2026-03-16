import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthModule (e2e)', () => {
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

  it('POST /api/auth/wechat should return access_token and user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/wechat')
      .send({ code: 'test-code', platform: 'h5' })
      .expect(201);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('wechat_open_id');
    expect(res.body.user).toHaveProperty('nickname');
    expect(res.body.user).toHaveProperty('avatar_url');
  });
});

