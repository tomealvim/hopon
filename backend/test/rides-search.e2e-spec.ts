import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  closeTestApp,
  prisma,
} from './setup-e2e';

describe('GET /api/v1/rides/search - seat availability filter (e2e)', () => {
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

  // search() caches results in memory (this.cache), keyed by the exact
  // query params. Every test below uses different origin/destination
  // strings specifically so each test gets its own cache key and never
  // reads a stale result left behind by a previous test.

  async function createVerifiedDriver(email: string) {
    const password = 'Password123!';
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password, name: 'Search Test Driver' });
    await request(server)
      .post('/api/v1/auth/test/verify-email')
      .send({ email });
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password });
    return login.body.accessToken as string;
  }

  async function createRideDirectly(params: {
    driverEmail: string;
    origin: string;
    destination: string;
    availableSeats: number;
    bookedSeats: number;
  }) {
    const driver = await prisma.user.findUniqueOrThrow({
      where: { email: params.driverEmail },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: driver.id,
        brand: 'Toyota',
        model: 'Yaris',
        color: 'Grey',
        seats: 4,
        fuelType: 'gasoleo',
      },
    });

    const departureTime = new Date(Date.now() + 24 * 3_600_000);

    const ride = await prisma.ride.create({
      data: {
        driverId: driver.id,
        vehicleId: vehicle.id,
        origin: params.origin,
        destination: params.destination,
        departureTime,
        availableSeats: params.availableSeats,
        priceCents: 350,
        status: 'SCHEDULED',
      },
    });

    if (params.bookedSeats > 0) {
      const passengerEmail = `passenger-${ride.id}@hopon.dev`;
      await createVerifiedDriver(passengerEmail);
      const passenger = await prisma.user.findUniqueOrThrow({
        where: { email: passengerEmail },
      });

      await prisma.booking.create({
        data: {
          rideId: ride.id,
          userId: passenger.id,
          seats: params.bookedSeats,
          status: 'CONFIRMED',
          paymentMethod: 'WALLET',
        },
      });
    }

    return ride;
  }

  it('returns a ride with seats remaining', async () => {
    await createVerifiedDriver('driver-open@hopon.dev');
    await createRideDirectly({
      driverEmail: 'driver-open@hopon.dev',
      origin: 'Lisboa Aberta',
      destination: 'Sintra Aberta',
      availableSeats: 3,
      bookedSeats: 1,
    });

    const response = await request(server)
      .get('/api/v1/rides/search')
      .query({ origin: 'Lisboa Aberta' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].destination).toBe('Sintra Aberta');
  });

  it('excludes a fully booked ride from search results - the bug fixed today', async () => {
    await createVerifiedDriver('driver-full@hopon.dev');
    await createRideDirectly({
      driverEmail: 'driver-full@hopon.dev',
      origin: 'Lisboa Cheia',
      destination: 'Cascais Cheia',
      availableSeats: 4,
      bookedSeats: 4,
    });

    const response = await request(server)
      .get('/api/v1/rides/search')
      .query({ origin: 'Lisboa Cheia' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  it('excludes a ride that has just enough bookings to drop below minSeats', async () => {
    await createVerifiedDriver('driver-tight@hopon.dev');
    await createRideDirectly({
      driverEmail: 'driver-tight@hopon.dev',
      origin: 'Lisboa Apertada',
      destination: 'Oeiras Apertada',
      availableSeats: 4,
      bookedSeats: 3,
    });

    const response = await request(server)
      .get('/api/v1/rides/search')
      .query({ origin: 'Lisboa Apertada', minSeats: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  it('includes a ride when minSeats matches exactly what remains', async () => {
    await createVerifiedDriver('driver-exact@hopon.dev');
    await createRideDirectly({
      driverEmail: 'driver-exact@hopon.dev',
      origin: 'Lisboa Exata',
      destination: 'Amadora Exata',
      availableSeats: 4,
      bookedSeats: 2,
    });

    const response = await request(server)
      .get('/api/v1/rides/search')
      .query({ origin: 'Lisboa Exata', minSeats: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('rejects minSeats below 1 as a validation error, not a silent fallback', async () => {
    const response = await request(server)
      .get('/api/v1/rides/search')
      .query({ minSeats: 0 });

    expect(response.status).toBe(400);
  });

  it('returns an empty array, not an error, when no rides match', async () => {
    const response = await request(server)
      .get('/api/v1/rides/search')
      .query({ origin: 'Sitio Que Nao Existe Em Lado Nenhum' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
