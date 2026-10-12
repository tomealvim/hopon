-- HopOn: exportar as 5 tabelas para CSV (camada RAW do Snowflake)
-- Sem dados pessoais: nada de email, telefone, password, documentos ou coordenadas

\copy (SELECT id, "emailVerifiedAt", "isIdentityVerified", "isAdmin", "createdAt", "updatedAt" FROM users) TO '/tmp/export/users.csv' WITH (FORMAT csv, HEADER true)

\copy (SELECT id, "driverId", "vehicleId", origin, destination, "departureTime", "availableSeats", "priceCents", "routeDistanceKm", "routeDurationMin", "routeTollCostCents", "platformFeeCents", "instantBooking", status, "cancelledAt", "scheduleTemplateId", "communityId", "createdAt", "updatedAt" FROM rides) TO '/tmp/export/rides.csv' WITH (FORMAT csv, HEADER true)

\copy (SELECT id, "rideId", "userId", seats, status, "paymentMethod", "detourMeters", "passengerConfirmed", "createdAt", "updatedAt" FROM bookings) TO '/tmp/export/bookings.csv' WITH (FORMAT csv, HEADER true)

\copy (SELECT id, "userId", "balanceCents", currency, "createdAt", "updatedAt" FROM wallets) TO '/tmp/export/wallets.csv' WITH (FORMAT csv, HEADER true)

\copy (SELECT id, "walletId", type, "amountCents", reference, "stripeEventId", "createdAt" FROM wallet_transactions) TO '/tmp/export/wallet_transactions.csv' WITH (FORMAT csv, HEADER true)
