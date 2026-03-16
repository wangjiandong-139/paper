import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UserModule (e2e)', () => {
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

  it('GET /api/users/me without auth should return 401', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);
  });

  it('PATCH /api/users/me should update profile when authorized', async () => {
    const server = app.getHttpServer();
    const token = 'test-token';

    const updateRes = await request(server)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nickname: 'Alice', avatar_url: 'https://example.com/a.png' })
      .expect(200);

    expect(updateRes.body).toMatchObject({
      id: 'mock-user-id',
      nickname: 'Alice',
      avatar_url: 'https://example.com/a.png',
    });

    const getRes = await request(server)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getRes.body).toMatchObject({
      id: 'mock-user-id',
      nickname: 'Alice',
      avatar_url: 'https://example.com/a.png',
    });
  });
}
);

