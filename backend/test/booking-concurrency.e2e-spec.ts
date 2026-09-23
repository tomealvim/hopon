import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  closeTestApp,
  prisma,
} from './setup-e2e';

describe('POST /api/v1/bookings/rides/:rideId - concurrency (e2e)', () => {
  let app: INestApplication;
  let server: any;

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

  async function registerVerifiedAndLogin(email: string) {
    const password = 'Password123!';
    const register = await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password, name: 'Concurrency Test User' });
    await request(server)
      .post('/api/v1/auth/test/verify-email')
      .set('Authorization', `Bearer ${register.body.accessToken}`)
      .send({ email });
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password });
    return login.body.accessToken as string;
  }

  async function prepareAsPassenger(email: string) {
    const accessToken = await registerVerifiedAndLogin(email);

    await prisma.user.update({
      where: { email },
      data: { phoneVerifiedAt: new Date() },
    });

    await request(server)
      .post('/api/v1/auth/me/accept-policy')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role: 'passenger' });

    await prisma.wallet.create({
      data: {
        userId: (await prisma.user.findUniqueOrThrow({ where: { email } })).id,
        balanceCents: 5000, // 50 EUR, well above the 3.50 EUR test ride price
      },
    });

    return accessToken;
  }

  async function createDriverWithRide(params: {
    driverEmail: string;
    availableSeats: number;
  }) {
    await registerVerifiedAndLogin(params.driverEmail);

    const driver = await prisma.user.findUniqueOrThrow({
      where: { email: params.driverEmail },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: driver.id,
        brand: 'Toyota',
        model: 'Yaris',
        color: 'Grey',
        seats: params.availableSeats,
        fuelType: 'gasoleo',
      },
    });

    const departureTime = new Date(Date.now() + 24 * 3_600_000);

    const ride = await prisma.ride.create({
      data: {
        driverId: driver.id,
        vehicleId: vehicle.id,
        origin: 'Lisboa Concorrencia',
        destination: 'Sintra Concorrencia',
        departureTime,
        availableSeats: params.availableSeats,
        priceCents: 350,
        status: 'SCHEDULED',
      },
    });

    return ride;
  }

  it('allows exactly one of two simultaneous bookings for the last seat', async () => {
    const ride = await createDriverWithRide({
      driverEmail: 'driver-concurrency@hopon.dev',
      availableSeats: 1,
    });

    const passengerAToken = await prepareAsPassenger('passenger-a@hopon.dev');
    const passengerBToken = await prepareAsPassenger('passenger-b@hopon.dev');

    const [responseA, responseB] = await Promise.all([
      request(server)
        .post(`/api/v1/bookings/rides/${ride.id}`)
        .set('Authorization', `Bearer ${passengerAToken}`)
        .send({ seats: 1 }),
      request(server)
        .post(`/api/v1/bookings/rides/${ride.id}`)
        .set('Authorization', `Bearer ${passengerBToken}`)
        .send({ seats: 1 }),
    ]);

    const successCount = [responseA, responseB].filter(
      (r) => r.status >= 200 && r.status < 300,
    ).length;
    const rejectedCount = [responseA, responseB].filter(
      (r) => r.status >= 400 && r.status < 500,
    ).length;

    expect(successCount).toBe(1);
    expect(rejectedCount).toBe(1);

    const bookings = await prisma.booking.findMany({
      where: { rideId: ride.id, status: { in: ['CONFIRMED', 'PENDING'] } },
    });
    const totalBookedSeats = bookings.reduce((sum, b) => sum + b.seats, 0);

    expect(bookings).toHaveLength(1);
    expect(totalBookedSeats).toBe(1);
  }, 15000);

  it('allows both simultaneous bookings when there are enough seats for both', async () => {
    const ride = await createDriverWithRide({
      driverEmail: 'driver-plenty@hopon.dev',
      availableSeats: 2,
    });

    const passengerAToken = await prepareAsPassenger('passenger-c@hopon.dev');
    const passengerBToken = await prepareAsPassenger('passenger-d@hopon.dev');

    const [responseA, responseB] = await Promise.all([
      request(server)
        .post(`/api/v1/bookings/rides/${ride.id}`)
        .set('Authorization', `Bearer ${passengerAToken}`)
        .send({ seats: 1 }),
      request(server)
        .post(`/api/v1/bookings/rides/${ride.id}`)
        .set('Authorization', `Bearer ${passengerBToken}`)
        .send({ seats: 1 }),
    ]);

    expect(responseA.status).toBeLessThan(300);
    expect(responseB.status).toBeLessThan(300);

    const bookings = await prisma.booking.findMany({
      where: { rideId: ride.id, status: { in: ['CONFIRMED', 'PENDING'] } },
    });
    expect(bookings).toHaveLength(2);
  }, 15000);

  it('rejects a booking that asks for more seats than remain, without racing', async () => {
    const ride = await createDriverWithRide({
      driverEmail: 'driver-oversell@hopon.dev',
      availableSeats: 2,
    });

    const passengerToken = await prepareAsPassenger('passenger-e@hopon.dev');

    const response = await request(server)
      .post(`/api/v1/bookings/rides/${ride.id}`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ seats: 3 });

    expect(response.status).toBe(400);

    const bookings = await prisma.booking.findMany({
      where: { rideId: ride.id },
    });
    expect(bookings).toHaveLength(0);
  }, 15000);
});
