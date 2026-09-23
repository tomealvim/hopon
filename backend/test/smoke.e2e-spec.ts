import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  closeTestApp,
  prisma,
} from './setup-e2e';

describe('smoke test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('boots the app and responds to a request', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1');
    expect([200, 404]).toContain(response.status);
  });

  it('confirms the test database is empty after cleaning', async () => {
    const userCount = await prisma.user.count();
    expect(userCount).toBe(0);
  });
});
