import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const driver = await prisma.user.upsert({
    where: { email: 'driver@hopon.dev' },
    update: {},
    create: {
      email: 'driver@hopon.dev',
      passwordHash,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          name: 'Ana Ferreira',
          username: 'ana.ferreira',
          setupCompleted: true,
          homeAddress: 'Lisboa, Portugal',
          homeLat: 38.7223,
          homeLng: -9.1393,
        },
      },
      vehicles: {
        create: {
          brand: 'Toyota',
          model: 'Yaris',
          color: 'Cinzento',
          seats: 4,
          fuelType: 'hibrido',
        },
      },
      wallets: {
        create: { balanceCents: 0 },
      },
    },
    include: { vehicles: true, wallets: true },
  });

  const passenger = await prisma.user.upsert({
    where: { email: 'passenger@hopon.dev' },
    update: {},
    create: {
      email: 'passenger@hopon.dev',
      passwordHash,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          name: 'Miguel Santos',
          username: 'miguel.santos',
          setupCompleted: true,
          homeAddress: 'Sintra, Portugal',
          homeLat: 38.8029,
          homeLng: -9.3817,
        },
      },
      wallets: {
        create: { balanceCents: 5000 }, // 50,00 EUR
      },
    },
    include: { wallets: true },
  });

  const vehicle = driver.vehicles[0];
  const tomorrow8am = new Date();
  tomorrow8am.setDate(tomorrow8am.getDate() + 1);
  tomorrow8am.setHours(8, 0, 0, 0);

  const dayAfter9am = new Date();
  dayAfter9am.setDate(dayAfter9am.getDate() + 2);
  dayAfter9am.setHours(9, 0, 0, 0);

  const ride1 = await prisma.ride.create({
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      origin: 'Lisboa, Portugal',
      destination: 'Sintra, Portugal',
      departureTime: tomorrow8am,
      availableSeats: 3,
      priceCents: 350, // 3,50 EUR
      status: 'SCHEDULED',
    },
  });

  await prisma.ride.create({
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      origin: 'Lisboa, Portugal',
      destination: 'Cascais, Portugal',
      departureTime: dayAfter9am,
      availableSeats: 2,
      priceCents: 400, // 4,00 EUR
      status: 'SCHEDULED',
    },
  });

  const passengerWallet = passenger.wallets[0];

  const booking = await prisma.booking.create({
    data: {
      rideId: ride1.id,
      userId: passenger.id,
      seats: 1,
      status: 'CONFIRMED',
      paymentMethod: 'WALLET',
    },
  });

  await prisma.wallet.update({
    where: { id: passengerWallet.id },
    data: { balanceCents: { decrement: ride1.priceCents ?? 0 } },
  });

  await prisma.walletTransaction.create({
    data: {
      walletId: passengerWallet.id,
      type: 'DEBIT',
      amountCents: ride1.priceCents ?? 0,
      reference: booking.id,
      description: `Reserva na boleia ${ride1.origin} → ${ride1.destination}`,
    },
  });

  console.log('Seed concluído:');
  console.log(`  driver:    ${driver.email} / Password123!`);
  console.log(`  passenger: ${passenger.email} / Password123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
