-- HopOn: dados sintéticos de demo para o projeto Snowflake + dbt
-- Só corre na base LOCAL do HopOn (container backend-postgres-1)
-- Cria ~60 utilizadores, 15 condutores com carro, ~350 boleias, reservas e movimentos de carteira

BEGIN;

SELECT setseed(0.42);

-- 1. Utilizadores (sem passwords, contactos falsos @hopon.dev)
INSERT INTO users (id, email, "emailVerifiedAt", "isIdentityVerified", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       'demo' || lpad(g::text, 2, '0') || '@hopon.dev',
       now() - interval '150 days' + (g || ' hours')::interval,
       random() < 0.6,
       now() - interval '160 days' + (g || ' hours')::interval,
       now()
FROM generate_series(1, 60) g;

-- 2. Veículos para os 15 primeiros (os condutores)
INSERT INTO vehicles (id, "userId", brand, model, seats, "fuelType", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u.id,
       (ARRAY['Toyota','Renault','Peugeot','Tesla','Seat'])[1 + (u.rn % 5)],
       (ARRAY['Yaris','Clio','208','Model 3','Ibiza'])[1 + (u.rn % 5)],
       (ARRAY[4, 4, 4, 4, 6])[1 + (u.rn % 5)],
       (ARRAY['hibrido','gasoleo','gasolina95','eletrico','gpl'])[1 + (u.rn % 5)],
       u."createdAt", now()
FROM (SELECT id, "createdAt", row_number() OVER (ORDER BY email) AS rn
      FROM users WHERE email LIKE 'demo%@hopon.dev') u
WHERE u.rn <= 15;

-- 3. Uma carteira por utilizador
INSERT INTO wallets (id, "userId", "balanceCents", currency, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, id, 0, 'EUR', "createdAt", now()
FROM users WHERE email LIKE 'demo%@hopon.dev';

-- 4. Boleias: 120 dias para trás e 14 para a frente, dias úteis, manhã e fim de tarde
WITH drivers AS MATERIALIZED (
  SELECT v.id AS vehicle_id, v."userId" AS driver_id, v.seats,
         row_number() OVER (ORDER BY v."userId") AS rn
  FROM vehicles v JOIN users u ON u.id = v."userId"
  WHERE u.email LIKE 'demo%@hopon.dev'
),
routes(rrn, origin, destination, km, mins, price) AS (
  VALUES (1, 'Sintra',  'Lisboa',  28.0, 40, 350),
         (2, 'Cascais', 'Lisboa',  32.0, 45, 400),
         (3, 'Almada',  'Lisboa',  14.0, 25, 250),
         (4, 'Oeiras',  'Lisboa',  18.0, 30, 300),
         (5, 'Lisboa',  'Sintra',  28.0, 40, 350),
         (6, 'Lisboa',  'Cascais', 32.0, 45, 400)
),
candidates AS MATERIALIZED (
  SELECT g,
         1 + floor(random() * 15)::int AS drn,
         1 + floor(random() * 6)::int  AS rrn,
         date_trunc('day', now() - interval '120 days')
           + floor(random() * 134)::int * interval '1 day'
           + CASE WHEN random() < 0.6
                  THEN interval '7 hours'  + floor(random() * 120)::int * interval '1 minute'
                  ELSE interval '17 hours' + floor(random() * 120)::int * interval '1 minute'
             END AS departure,
         random() AS r_status,
         random() AS r_seats
  FROM generate_series(1, 450) g
)
INSERT INTO rides (id, "driverId", "vehicleId", origin, destination, "departureTime",
                   "availableSeats", "priceCents", "routeDistanceKm", "routeDurationMin",
                   "platformFeeCents", status, "cancelledAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, d.driver_id, d.vehicle_id, r.origin, r.destination, c.departure,
       1 + floor(c.r_seats * (d.seats - 1))::int,
       r.price, r.km, r.mins, 50,
       CASE WHEN c.departure > now() THEN 'SCHEDULED'
            WHEN c.r_status < 0.08 THEN 'CANCELLED'
            ELSE 'COMPLETED' END,
       CASE WHEN c.departure <= now() AND c.r_status < 0.08 THEN c.departure - interval '3 hours' END,
       c.departure - interval '5 days', now()
FROM candidates c
JOIN drivers d ON d.rn = c.drn
JOIN routes r  ON r.rrn = c.rrn
WHERE extract(isodow FROM c.departure) < 6;

-- 5. Reservas: nunca mais lugares do que os disponíveis, passageiros diferentes por boleia
WITH passengers AS MATERIALIZED (
  SELECT id AS user_id, row_number() OVER (ORDER BY email) - 16 AS prn   -- 0..44
  FROM users WHERE email LIKE 'demo%@hopon.dev'
),
ride_plan AS MATERIALIZED (
  SELECT id AS ride_id, status, "departureTime", "availableSeats",
         floor(random() * ("availableSeats" + 1))::int AS n_bookings,
         floor(random() * 45)::int AS offset_p
  FROM rides
  WHERE "driverId" IN (SELECT id FROM users WHERE email LIKE 'demo%@hopon.dev')
),
slots AS MATERIALIZED (
  SELECT rp.*, k, random() AS r_status
  FROM ride_plan rp, generate_series(1, rp.n_bookings) k
)
INSERT INTO bookings (id, "rideId", "userId", seats, status, "paymentMethod", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s.ride_id, p.user_id, 1,
       CASE WHEN s.status = 'CANCELLED' THEN 'CANCELLED'
            WHEN s.status = 'SCHEDULED' THEN CASE WHEN s.r_status < 0.8 THEN 'CONFIRMED' ELSE 'PENDING' END
            WHEN s.r_status < 0.06 THEN 'CANCELLED'
            ELSE 'COMPLETED' END,
       'WALLET',
       LEAST(s."departureTime" - (floor(s.r_status * 6)::int || ' days')::interval, now()),
       now()
FROM slots s
JOIN passengers p ON p.prn = (s.offset_p + s.k * 7) % 45;

-- 6. Carteira: débito ao passageiro e crédito ao condutor por cada reserva concluída
INSERT INTO wallet_transactions (id, "walletId", type, "amountCents", reference, description, "createdAt")
SELECT gen_random_uuid()::text, w.id, 'DEBIT', r."priceCents", b.id, 'Pagamento de boleia', r."departureTime"
FROM bookings b
JOIN rides r   ON r.id = b."rideId"
JOIN wallets w ON w."userId" = b."userId"
WHERE b.status = 'COMPLETED';

INSERT INTO wallet_transactions (id, "walletId", type, "amountCents", reference, description, "createdAt")
SELECT gen_random_uuid()::text, w.id, 'CREDIT', r."priceCents" - r."platformFeeCents", b.id, 'Receita de boleia', r."departureTime"
FROM bookings b
JOIN rides r   ON r.id = b."rideId"
JOIN wallets w ON w."userId" = r."driverId"
WHERE b.status = 'COMPLETED';

-- Carregamentos via Stripe (modo teste) para os passageiros
INSERT INTO wallet_transactions (id, "walletId", type, "amountCents", reference, description, "stripeEventId", "createdAt")
SELECT gen_random_uuid()::text, w.id, 'CREDIT', (ARRAY[1000, 2000, 5000])[1 + floor(random() * 3)::int],
       NULL, 'Carregamento Stripe', 'evt_demo_' || g, now() - (floor(random() * 120)::int || ' days')::interval
FROM generate_series(1, 120) g
JOIN LATERAL (
  SELECT w.id FROM wallets w JOIN users u ON u.id = w."userId"
  WHERE u.email LIKE 'demo%@hopon.dev'
  ORDER BY md5(w.id || g::text) LIMIT 1
) w ON true;

-- Carregamento extra para quem ficaria com saldo negativo (ninguém paga sem saldo)
INSERT INTO wallet_transactions (id, "walletId", type, "amountCents", reference, description, "stripeEventId", "createdAt")
SELECT gen_random_uuid()::text, t."walletId", 'CREDIT',
       (ceil(-t.saldo / 1000.0) * 1000 + 1000)::int,
       NULL, 'Carregamento Stripe', 'evt_demo_topup_' || row_number() OVER (), now() - interval '125 days'
FROM (
  SELECT "walletId",
         SUM(CASE WHEN type IN ('CREDIT','REFUND') THEN "amountCents" ELSE -"amountCents" END) AS saldo
  FROM wallet_transactions GROUP BY "walletId"
) t
WHERE t.saldo < 0;

-- 7. Saldo das carteiras coerente com os movimentos
UPDATE wallets w
SET "balanceCents" = t.saldo, "updatedAt" = now()
FROM (
  SELECT "walletId",
         SUM(CASE WHEN type IN ('CREDIT','REFUND') THEN "amountCents" ELSE -"amountCents" END) AS saldo
  FROM wallet_transactions GROUP BY "walletId"
) t
WHERE t."walletId" = w.id;

COMMIT;

ANALYZE;

SELECT 'users' AS tabela, count(*) FROM users
UNION ALL SELECT 'vehicles', count(*) FROM vehicles
UNION ALL SELECT 'wallets', count(*) FROM wallets
UNION ALL SELECT 'rides', count(*) FROM rides
UNION ALL SELECT 'bookings', count(*) FROM bookings
UNION ALL SELECT 'wallet_transactions', count(*) FROM wallet_transactions;
