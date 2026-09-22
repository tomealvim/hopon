// backend/tests/test-db-verify.js
/**
 * Verifica consistência da BD via API após os testes principais.
 * Cria um utilizador, veículo, boleia e reserva, e valida que cada
 * recurso aparece nos endpoints de leitura correspondentes.
 *
 * Requer ALLOW_TEST_VERIFY=1 no backend para verificação de email via API.
 *
 * Uso:
 *   node tests/test-db-verify.js
 *   API_BASE=https://hopon-production-5bd2.up.railway.app/api/v1 node tests/test-db-verify.js
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    checks.push({ name, ok: true });
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` - ${detail}` : ''}`);
    checks.push({ name, ok: false, detail });
    failed++;
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = await res.text();
  }
  return { status: res.status, data };
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function randomPhone() {
  return `+3519${Math.floor(10000000 + Math.random() * 89999999)}`;
}

async function registerAndVerify(label) {
  const suffix = randomSuffix();
  const email = `dbverify_${label}_${suffix}@example.com`;
  const password = 'Password123!';

  const regRes = await req('POST', '/auth/register', {
    email,
    password,
    name: `DB Verify ${label}`,
    phone: randomPhone(),
  });

  if (regRes.status !== 201) {
    throw new Error(`Registo de ${label} falhou: ${JSON.stringify(regRes.data)}`);
  }

  const token = regRes.data.accessToken;

  // Verificar email via endpoint de teste
  const verifyRes = await req('POST', '/auth/test/verify-email', { email }, token);
  if (verifyRes.status !== 200 && verifyRes.status !== 201) {
    console.warn(`  ⚠️  Verificação de email de ${label} falhou (status ${verifyRes.status}). Certifica-te de que ALLOW_TEST_VERIFY=1 está definido.`);
  }

  // Re-login para obter token fresco após verificação
  const loginRes = await req('POST', '/auth/login', { email, password });
  const freshToken = loginRes.data.accessToken || token;

  return { email, token: freshToken, userId: regRes.data.user?.id };
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔍 DB VERIFY - Consistência da BD via API');
  console.log(`   Target: ${API_BASE}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ─── 1. USER ───────────────────────────────────────────────────────────────
  console.log('── 1. Criação e leitura de utilizador ──');
  let driverToken, passengerToken, driverEmail;

  try {
    const driver = await registerAndVerify('driver');
    driverToken = driver.token;
    driverEmail = driver.email;

    const passenger = await registerAndVerify('passenger');
    passengerToken = passenger.token;

    const meRes = await req('GET', '/auth/me', null, driverToken);
    check('GET /auth/me retorna 200', meRes.status === 200);
    check('GET /auth/me retorna email correto', meRes.data.email === driverEmail, `got: ${meRes.data.email}`);
  } catch (err) {
    check('Registo/login do utilizador', false, err.message);
    printSummary();
    return;
  }

  // ─── 2. VEÍCULO ────────────────────────────────────────────────────────────
  console.log('\n── 2. Criação e leitura de veículo ──');
  let vehicleId;

  const vehiclePayload = {
    brand: 'Toyota',
    model: 'Corolla',
    color: 'Azul',
    plate: `TS-${randomSuffix().toUpperCase().slice(0, 2)}-00`,
    seats: 4,
    features: { airConditioning: true, heater: false },
  };

  const createVehicleRes = await req('POST', '/vehicles', vehiclePayload, driverToken);
  check('POST /vehicles retorna 201', createVehicleRes.status === 201, `status: ${createVehicleRes.status}`);
  vehicleId = createVehicleRes.data.id;

  const listVehiclesRes = await req('GET', '/vehicles', null, driverToken);
  check('GET /vehicles retorna 200', listVehiclesRes.status === 200);
  const vehicleFound = Array.isArray(listVehiclesRes.data) && listVehiclesRes.data.some(v => v.id === vehicleId);
  check('Veículo criado aparece em GET /vehicles', vehicleFound, `id: ${vehicleId}`);

  if (vehicleId) {
    const vehicle = listVehiclesRes.data?.find(v => v.id === vehicleId);
    check('Veículo tem features corretas (airConditioning=true)', vehicle?.features?.airConditioning === true);
  }

  // ─── 3. BOLEIA ─────────────────────────────────────────────────────────────
  console.log('\n── 3. Criação e leitura de boleia ──');
  let rideId;

  if (!vehicleId) {
    check('Boleia (ignorada - veículo não criado)', false, 'depende da etapa anterior');
  } else {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const ridePayload = {
      vehicleId,
      origin: 'Porto, Portugal',
      destination: 'Lisboa, Portugal',
      departureTime: tomorrow,
      availableSeats: 3,
      price: 0,
    };

    const createRideRes = await req('POST', '/rides', ridePayload, driverToken);
    check('POST /rides retorna 201', createRideRes.status === 201, `status: ${createRideRes.status} - ${JSON.stringify(createRideRes.data)}`);
    rideId = createRideRes.data.id;

    const myRidesRes = await req('GET', '/rides/my', null, driverToken);
    check('GET /rides/my retorna 200', myRidesRes.status === 200);
    const rideFound = Array.isArray(myRidesRes.data) && myRidesRes.data.some(r => r.id === rideId);
    check('Boleia criada aparece em GET /rides/my', rideFound, `rideId: ${rideId}`);

    if (rideId) {
      const rideRes = await req('GET', `/rides/${rideId}`, null, driverToken);
      check('GET /rides/:id retorna seats corretos', rideRes.data.availableSeats === 3);
      check('GET /rides/:id retorna price correto', Number(rideRes.data.price) === 0);
    }
  }

  // ─── 4. RESERVA ────────────────────────────────────────────────────────────
  console.log('\n── 4. Criação e leitura de reserva ──');
  let bookingId;

  if (!rideId) {
    check('Reserva (ignorada - boleia não criada)', false, 'depende da etapa anterior');
  } else {
    const bookingRes = await req('POST', `/bookings/rides/${rideId}`, { seats: 1 }, passengerToken);
    check('POST /bookings/rides/:id retorna 201', bookingRes.status === 201, `status: ${bookingRes.status} - ${JSON.stringify(bookingRes.data)}`);
    bookingId = bookingRes.data.id;

    const myBookingsRes = await req('GET', '/bookings/my', null, passengerToken);
    check('GET /bookings/my retorna 200', myBookingsRes.status === 200);
    const bookingFound = Array.isArray(myBookingsRes.data) && myBookingsRes.data.some(b => b.id === bookingId);
    check('Reserva criada aparece em GET /bookings/my', bookingFound, `bookingId: ${bookingId}`);

    if (bookingId) {
      const booking = myBookingsRes.data?.find(b => b.id === bookingId);
      check('Reserva tem status PENDING', booking?.status === 'PENDING', `status: ${booking?.status}`);
    }
  }

  // ─── 5. INBOX ──────────────────────────────────────────────────────────────
  console.log('\n── 5. Inbox - conversa após reserva ──');

  const convRes = await req('GET', '/inbox/conversations', null, passengerToken);
  check('GET /inbox/conversations retorna 200', convRes.status === 200);
  if (bookingId) {
    const hasConv = Array.isArray(convRes.data) && convRes.data.length > 0;
    check('Conversa criada após reserva aparece em /inbox/conversations', hasConv, `count: ${convRes.data?.length}`);
  }

  // ─── 6. NOTIFICAÇÕES ───────────────────────────────────────────────────────
  console.log('\n── 6. Notificações não lidas para o driver ──');

  if (bookingId) {
    const notifRes = await req('GET', '/notifications/unread-count', null, driverToken);
    check('GET /notifications/unread-count retorna 200', notifRes.status === 200);
    const count = notifRes.data?.count ?? notifRes.data?.unreadCount ?? notifRes.data;
    check('Driver tem notificações não lidas (> 0)', Number(count) > 0, `count: ${JSON.stringify(notifRes.data)}`);
  } else {
    console.log('  ⚠️  Notificações ignoradas (reserva não foi criada)');
  }

  printSummary();
}

function printSummary() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESUMO - DB VERIFY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Passaram: ${passed}   ❌ Falharam: ${failed}   Total: ${passed + failed}`);
  console.log('');

  if (failed > 0) {
    console.log('Falhas:');
    checks.filter(c => !c.ok).forEach(c => {
      console.log(`  ❌ ${c.name}${c.detail ? ` - ${c.detail}` : ''}`);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('🎉 Todos os checks passaram - BD consistente!');
    console.log('');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
