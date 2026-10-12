-- RAW tables (same columns as the CSVs) and load with COPY INTO
USE ROLE ACCOUNTADMIN;
USE WAREHOUSE HOPON_WH;
USE SCHEMA HOPON.RAW;

CREATE OR REPLACE TABLE USERS (
  id                 VARCHAR,
  emailVerifiedAt    TIMESTAMP_NTZ,
  isIdentityVerified BOOLEAN,
  isAdmin            BOOLEAN,
  createdAt          TIMESTAMP_NTZ,
  updatedAt          TIMESTAMP_NTZ
);

CREATE OR REPLACE TABLE RIDES (
  id                 VARCHAR,
  driverId           VARCHAR,
  vehicleId          VARCHAR,
  origin             VARCHAR,
  destination        VARCHAR,
  departureTime      TIMESTAMP_NTZ,
  availableSeats     INTEGER,
  priceCents         INTEGER,
  routeDistanceKm    FLOAT,
  routeDurationMin   INTEGER,
  routeTollCostCents INTEGER,
  platformFeeCents   INTEGER,
  instantBooking     BOOLEAN,
  status             VARCHAR,
  cancelledAt        TIMESTAMP_NTZ,
  scheduleTemplateId VARCHAR,
  communityId        VARCHAR,
  createdAt          TIMESTAMP_NTZ,
  updatedAt          TIMESTAMP_NTZ
);

CREATE OR REPLACE TABLE BOOKINGS (
  id                 VARCHAR,
  rideId             VARCHAR,
  userId             VARCHAR,
  seats              INTEGER,
  status             VARCHAR,
  paymentMethod      VARCHAR,
  detourMeters       INTEGER,
  passengerConfirmed BOOLEAN,
  createdAt          TIMESTAMP_NTZ,
  updatedAt          TIMESTAMP_NTZ
);

CREATE OR REPLACE TABLE WALLETS (
  id           VARCHAR,
  userId       VARCHAR,
  balanceCents INTEGER,
  currency     VARCHAR,
  createdAt    TIMESTAMP_NTZ,
  updatedAt    TIMESTAMP_NTZ
);

CREATE OR REPLACE TABLE WALLET_TRANSACTIONS (
  id            VARCHAR,
  walletId      VARCHAR,
  type          VARCHAR,
  amountCents   INTEGER,
  reference     VARCHAR,
  stripeEventId VARCHAR,
  createdAt     TIMESTAMP_NTZ
);

COPY INTO USERS               FROM @HOPON_STAGE PATTERN = '.*users[.]csv.*';
COPY INTO RIDES               FROM @HOPON_STAGE PATTERN = '.*rides[.]csv.*';
COPY INTO BOOKINGS            FROM @HOPON_STAGE PATTERN = '.*bookings[.]csv.*';
COPY INTO WALLETS             FROM @HOPON_STAGE PATTERN = '.*wallets[.]csv.*';
COPY INTO WALLET_TRANSACTIONS FROM @HOPON_STAGE PATTERN = '.*wallet_transactions[.]csv.*';

-- Reconciliation: compare with the row counts in Postgres
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM USERS
UNION ALL SELECT 'rides', COUNT(*) FROM RIDES
UNION ALL SELECT 'bookings', COUNT(*) FROM BOOKINGS
UNION ALL SELECT 'wallets', COUNT(*) FROM WALLETS
UNION ALL SELECT 'wallet_transactions', COUNT(*) FROM WALLET_TRANSACTIONS;
