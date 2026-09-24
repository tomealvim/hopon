# HopOn

**Carpooling for recurring commutes.** Most ride-sharing apps are built around one-off
long-distance trips. HopOn is built around the trip you make every weekday: the same
route, the same time, the same few people, with the cost split automatically.

**Live demo:** https://hopon.up.railway.app

## The problem

Someone driving the same route every morning has four empty seats and pays for fuel and
tolls alone. Someone else on that route has no car. The two never find each other,
because existing apps ask you to re-post the same trip every single day and settle
payments in cash.

HopOn handles the recurring case: a driver publishes a schedule instead of a trip,
passengers subscribe to seats, and money moves through an in-app wallet so nobody is
counting coins at 8am.

## What's built

| Area | What it does |
|---|---|
| Rides | Publish one-off or recurring rides, seat availability, route corridor matching |
| Bookings | Seat reservation, tiered cancellation fees |
| Wallet & payments | Stripe top-ups, in-app balance, driver payouts |
| Auth | Email/password and Google OAuth, JWT access + refresh tokens |
| Trust | Identity document verification, post-ride ratings, dispute flow |
| Background jobs | BullMQ queues for reminders, auto-cancellation, payout scheduling |

## Stack

**Backend** NestJS, TypeScript, PostgreSQL (Prisma), Redis + BullMQ, Stripe
**Frontend** React 19, Vite, Tailwind CSS 4
**Infra** Docker Compose (local), Railway (deploy), Cloudflare R2 (object storage)
**Maps** Google Geocoding and Directions (backend), Google Places (frontend),
Leaflet + OpenStreetMap for the interactive picker

## Engineering notes

**Money is stored in cents, as integers.** The first version used floats. Rounding drift
showed up as soon as a fare was split three ways. A migration converts every monetary
column, and pricing now works exclusively in integer cents, rounding only at display
time.

**Route matching is computed locally, not fetched.** A driver's route polyline is
geocoded once and cached. Matching a passenger to a ride is then point-to-segment
distance maths against that stored polyline, so adding passengers costs no extra API
calls.

**Pricing is a pure function.** Distance, seats and platform fee go in, a fare in cents
comes out. No database access, no side effects.

**Test-only routes are blocked in production.** Two endpoints exist to skip email
verification and licence approval during local testing. They return 403 whenever
`NODE_ENV=production`, regardless of any environment flag.

## Running locally

Requires Node 22 and Docker.

```bash
git clone https://github.com/tomealvim/hopon.git
cd hopon

# Backend
cd backend
cp .env.example .env

# Postgres + Redis + MinIO
docker compose up -d

npm ci
npx prisma migrate deploy
npm run seed
npm run dev

# Frontend, in another terminal, from the repo root
npm ci
npm run dev
```

The seed creates two users (`driver@hopon.dev` and `passenger@hopon.dev`, password
`Password123!`), a couple of rides and a funded wallet, so the booking and payment
flows work immediately.

Stripe runs in test mode: card `4242 4242 4242 4242`, any future expiry, any CVC.

Some features need external credentials to work locally (Google Maps for address
autocomplete, Google Vision for document checks, Resend for email). Without them the app
still boots and most flows work; see `.env.example` for what each one enables.

## Scope

A personal project, built solo over roughly nine months. It runs end to end and is
deployed, but it is not a production service: there are no real users, Stripe never
leaves test mode, and the Capacitor mobile build is an experiment rather than a shipped
app.

Automated test coverage is currently being added, starting with the pricing and
cancellation-fee logic, alongside a CI pipeline running lint, type check and tests on
every push.

## License

MIT
