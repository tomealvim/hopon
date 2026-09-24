import { INestApplication } from '@nestjs/common';
import { createTestApp, cleanDatabase, closeTestApp, prisma } from './setup-e2e';
import { WalletService } from '../src/modules/wallet/wallet.service';

// This suite calls WalletService.creditFromStripe directly rather than
// going through the HTTP webhook endpoint. Building a genuinely valid
// Stripe webhook signature in a test means either mocking the Stripe SDK's
// signature verification or vendoring real Stripe fixtures - both add
// complexity without testing anything closer to the actual bug we care
// about, which lives entirely inside creditFromStripe's transaction and
// unique constraint handling. The signature verification itself is a
// separate, already-confirmed concern (StripeService.handleWebhook wraps
// stripe.webhooks.constructEvent in a try/catch that rejects with 400).
describe('Stripe webhook idempotency - concurrent duplicate delivery (e2e)', () => {
  let app: INestApplication;
  let walletService: WalletService;

  beforeAll(async () => {
    app = await createTestApp();
    walletService = app.get(WalletService);
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  async function createUserWithWallet(email: string) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'not-a-real-hash-not-used-in-this-test',
        emailVerifiedAt: new Date(),
      },
    });
    const wallet = await prisma.wallet.create({
      data: { userId: user.id, balanceCents: 0 },
    });
    return { user, wallet };
  }

  it(
    'credits the wallet only once when the same Stripe event is delivered twice simultaneously',
    async () => {
      const { user } = await createUserWithWallet('stripe-idempotency-a@hopon.dev');

      const stripeEventId = 'evt_test_duplicate_delivery_1';
      const paymentIntentId = 'pi_test_1';
      const amountCents = 2000; // 20 EUR

      const results = await Promise.allSettled([
        walletService.creditFromStripe(
          stripeEventId,
          paymentIntentId,
          user.id,
          amountCents,
        ),
        walletService.creditFromStripe(
          stripeEventId,
          paymentIntentId,
          user.id,
          amountCents,
        ),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');

      const transactions = await prisma.walletTransaction.findMany({
        where: { stripeEventId },
      });
      expect(transactions).toHaveLength(1);

      const wallet = await prisma.wallet.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(wallet.balanceCents).toBe(amountCents);
    },
    15000,
  );

  it(
    'credits the wallet twice for two genuinely different events with the same payment intent',
    async () => {
      const { user } = await createUserWithWallet('stripe-idempotency-b@hopon.dev');
      const paymentIntentId = 'pi_test_2';
      const amountCents = 1000;

      await walletService.creditFromStripe(
        'evt_test_first',
        paymentIntentId,
        user.id,
        amountCents,
      );
      await walletService.creditFromStripe(
        'evt_test_second',
        paymentIntentId,
        user.id,
        amountCents,
      );

      const transactions = await prisma.walletTransaction.findMany({
        where: { reference: paymentIntentId },
      });
      expect(transactions).toHaveLength(2);

      const wallet = await prisma.wallet.findFirstOrThrow({
        where: { userId: user.id },
      });
      expect(wallet.balanceCents).toBe(amountCents * 2);
    },
    15000,
  );

  it('returns the same transaction record on a sequential retry of the same event', async () => {
    const { user } = await createUserWithWallet('stripe-idempotency-c@hopon.dev');
    const stripeEventId = 'evt_test_sequential_retry';
    const amountCents = 500;

    const first = await walletService.creditFromStripe(
      stripeEventId,
      'pi_test_3',
      user.id,
      amountCents,
    );
    const second = await walletService.creditFromStripe(
      stripeEventId,
      'pi_test_3',
      user.id,
      amountCents,
    );

    expect(second.id).toBe(first.id);

    const wallet = await prisma.wallet.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(wallet.balanceCents).toBe(amountCents); // not amountCents * 2
  });
});
