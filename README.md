# HopOn

[![CI](https://github.com/tomealvim/hopon/actions/workflows/ci.yml/badge.svg)](https://github.com/tomealvim/hopon/actions/workflows/ci.yml)

**Carpooling for recurring commutes.** Most ride-sharing apps are built around one-off
long-distance trips. HopOn is built around the trip you make every weekday: the same
route, the same time, the same few people, with the cost split automatically.

**Live demo:** https://hopon.up.railway.app

## The problem

Someone driving the same route every morning has empty seats and pays for fuel and
tolls alone. Someone else on that route has no car. Existing apps ask you to re-post
the same trip every day and settle payments in cash.

HopOn handles the recurring case: a driver publishes a ride, passengers book a seat,
and money moves through an in-app wallet.

## What's built

| Area | What it does |
|---|---|
| Rides | Publish recurring or one-off rides, seat availability |
| Bookings | Seat reservation with a transactional lock against overbooking, tiered cancellation fees |
| Wallet & payments | Stripe top-ups (test mode), in-app balance, payout requests (approved manually via the admin API) |
| Auth | Email/password and Google OAuth, JWT access + refresh tokens |
| Trust | Driver's licence verification (manual approval), post-ride ratings, dispute reporting |
| Communities | Private groups with invite codes and approval flow |
| Background jobs | A BullMQ queue for email delivery, plus a scheduler module for recurring jobs |

Two things worth being upfront about:

- **The admin module exists but has no interface.** 14 backend routes handle
  moderation (approving documents, resolving disputes, processing payout requests) -
  there's no admin screen in the app yet, only the API.
- **Some modules have zero automated test coverage**: wallet top-ups/payouts,
  ratings, disputes, notifications, and the scheduled jobs. See Testing below for
  exactly what is and isn't covered.

## Stack

- **Backend** NestJS 10, TypeScript, PostgreSQL 15 (Prisma), Redis + BullMQ, Stripe
- **Frontend** React 19, Vite, Tailwind CSS
- **Infra** Docker Compose (local), Railway (deploy), Cloudflare R2 (object storage)
- **Maps** Google Geocoding and Directions (backend), Google Places (frontend),
Leaflet + OpenStreetMap for the interactive map picker

Full dependency list in `backend/package.json` and `package.json`.

## Engineering notes

**Money is stored in cents, as integers.** An earlier version used floats. Rounding
drift showed up as soon as a fare was split across seats. A migration converted every
monetary column, and pricing now works exclusively in integer cents, rounding only at
display time. Every `Float` field left in the schema today is a coordinate, a fuel
consumption number, or a distance measurement - never money. No `Decimal` field
exists at all.

**Seat booking runs inside a transaction with a row lock.** `SELECT ... FOR UPDATE`
serialises two passengers competing for the last seat. Tested by actually firing
concurrent requests (`Promise.all`, not sequential calls) at the same ride: exactly
one booking succeeds, the other gets a clean rejection, and the database always
agrees.

**Stripe webhook idempotency is enforced by the database, not just application logic.**
The first version checked for an existing transaction before crediting the wallet -
safe against a single retry, but not against two genuinely concurrent deliveries of
the same event, which Stripe documents can happen. A unique constraint on the Stripe
event ID now makes the database the source of truth: a duplicate delivery hits a
constraint violation and returns the existing transaction instead of crediting twice.
Confirmed with the same concurrent-request test pattern used for booking.

**Route matching is computed locally, not fetched.** A driver's route polyline is
geocoded once when the ride is created and stored in Postgres. Matching a passenger's
pickup point to a ride is then point-to-segment distance math against that stored
polyline - no extra API call per match, no matter how many passengers search.

**Email verification gates specific actions, not login.** You can register and explore
the app right away; publishing a ride, booking a seat, or managing a schedule requires
a verified email. A deliberate product choice to keep onboarding friction low.

**Test-only routes are locked out of production, twice over.** Two endpoints exist
to skip email verification and document approval during local testing. They return
403 whenever `NODE_ENV=production`, regardless of the `ALLOW_TEST_VERIFY` flag -
a deliberate second layer, in case the flag is ever set by mistake.

## Testing and CI

53 automated tests across 7 files - 25 unit tests, 28 integration tests against real
Postgres and Redis, no mocks for the database layer.

```bash
cd backend
npm test          # unit: pricing calculation, cancellation fee tiers
npm run test:e2e  # integration: auth, seat booking under real concurrency,
                   # search filtering, Stripe webhook idempotency
```

What's covered, deliberately chosen over chasing coverage percentage: pricing math,
the cancellation refund logic (every time-window boundary), the full auth flow
(register through token refresh, including that logout actually revokes tokens
server-side), search excluding fully-booked rides, and two concurrency scenarios that
only a genuinely simultaneous request can catch - seat booking and Stripe webhook
idempotency.

What isn't covered yet: wallet top-ups end to end, ratings, disputes, notifications,
and the scheduled jobs. No frontend tests exist.

Every push to `main` runs lint and build for backend and frontend, applies all
migrations to a fresh database (so a broken migration fails the build instead of
surfacing in production), and runs the full suite against real Postgres and Redis
containers.

## Running locally

Requires Node 22 and Docker.

```bash
git clone https://github.com/tomealvim/hopon.git
cd hopon

# Backend
cd backend
cp .env.example .env
docker compose up -d          # Postgres + Redis + MinIO
npm ci
npx prisma migrate deploy
npm run seed
npm run dev

# Frontend, in another terminal, from the repo root
npm ci
npm run dev
```

The frontend boots with zero configuration; the backend needs the `.env` above.

The seed creates `driver@hopon.dev` and `passenger@hopon.dev` (password
`Password123!`, local only), a couple of published rides, and one confirmed booking.
The passenger account has a funded wallet, so it's the one to use for trying a
booking.

Stripe runs in test mode: card `4242 4242 4242 4242`, any future expiry, any CVC.

Without external credentials the app still boots. Some things fail loudly - route
pricing without a Google Maps key, importing a schedule from a photo without a Google
Vision key, and payments without a Stripe key all return a clear error. Others fall
back quietly - address autocomplete just returns no suggestions, and OTP codes get
logged to the server console instead of emailed. See `.env.example` for what each one
enables.

## Deploy

Backend and frontend deploy separately on Railway, auto-deploying from `main`.
PostgreSQL, Redis, and Cloudflare R2 (object storage) are also on Railway/Cloudflare.
Stripe, Google Maps, Google Vision, and Resend run in production as external services.
