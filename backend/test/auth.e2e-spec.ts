import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, cleanDatabase, closeTestApp, prisma } from './setup-e2e';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let server: any;

  const testUser = {
    email: 'auth-test@hopon.dev',
    password: 'Password123!',
    name: 'Auth Test User',
  };

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a new user and returns 201', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);

      const created = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(created).not.toBeNull();
      expect(created?.email).toBe(testUser.email);
    });

    it('rejects a second registration with the same email', async () => {
      await request(server).post('/api/v1/auth/register').send(testUser);

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('rejects an invalid email with 400', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'not-an-email' });

      expect(response.status).toBe(400);
    });

    it('rejects a password shorter than the minimum length', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({ ...testUser, password: '123' });

      expect(response.status).toBe(400);
    });

    it('rejects a payload with an unexpected extra field (forbidNonWhitelisted)', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({ ...testUser, isAdmin: true });

      expect(response.status).toBe(400);
    });
  });

  describe('login and protected routes', () => {
    async function registerAndVerify(email: string, password: string) {
      const register = await request(server)
        .post('/api/v1/auth/register')
        .send({ email, password, name: 'Verified User' });

      await request(server)
        .post('/api/v1/auth/test/verify-email')
        .set('Authorization', `Bearer ${register.body.accessToken}`)
        .send({ email });
    }

    it('logs in successfully after email verification and returns tokens', async () => {
      await registerAndVerify(testUser.email, testUser.password);

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('rejects login with the wrong password', async () => {
      await registerAndVerify(testUser.email, testUser.password);

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword!' });

      expect(response.status).toBe(401);
    });

    it('rejects login for an email that was never registered', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@hopon.dev', password: 'whatever123' });

      expect(response.status).toBe(401);
    });

    it('allows access to a protected route (GET /me) with a valid access token', async () => {
      await registerAndVerify(testUser.email, testUser.password);
      const login = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(testUser.email);
    });

    it('rejects a protected route with no Authorization header', async () => {
      const response = await request(server).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
    });

    it('rejects a protected route with a garbage/invalid token', async () => {
      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer this-is-not-a-real-jwt');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    async function registerLoginAndVerify(email: string, password: string) {
      const register = await request(server)
        .post('/api/v1/auth/register')
        .send({ email, password, name: 'Refresh Test User' });

      await request(server)
        .post('/api/v1/auth/test/verify-email')
        .set('Authorization', `Bearer ${register.body.accessToken}`)
        .send({ email });

      const login = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password });

      return login.body as { accessToken: string; refreshToken: string };
    }

    it('exchanges a valid refresh token for a new access token', async () => {
      const { refreshToken } = await registerLoginAndVerify(
        testUser.email,
        testUser.password,
      );

      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');

      const me = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${response.body.accessToken}`);
      expect(me.status).toBe(200);
    });

    it('rejects an invalid/garbage refresh token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'not-a-real-refresh-token' });

      expect(response.status).toBe(401);
    });

    it('rejects reusing a refresh token after logout', async () => {
      const { accessToken, refreshToken } = await registerLoginAndVerify(
        testUser.email,
        testUser.password,
      );

      const logoutResponse = await request(server)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });
      expect(logoutResponse.status).toBeLessThan(500);

      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(401);
    });
  });
});
