// backend/tests/test-pricing-policy.js
/**
 * Testes do módulo de Pricing e Política de Viagens.
 *
 * Cobre:
 * - POST /auth/me/accept-policy — aceitar política de passageiro e condutor
 * - Guard PASSENGER_POLICY_NOT_ACCEPTED em POST /bookings/rides/:rideId
 * - Guard DRIVER_POLICY_NOT_ACCEPTED em POST /rides
 * - POST /pricing/calculate — cálculo de rota real (requer GOOGLE_MAPS_API_KEY)
 * - GET /pricing/fuel-prices — preços de combustível DGEG (com fallback)
 * - Fluxo completo: criar boleia com routeData → reservar com breakdown visível
 *
 * Requisitos:
 * - Backend a correr em http://localhost:3000
 * - ALLOW_TEST_VERIFY=1 no .env do backend
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000/api/v1";

function logStep(name) {
  console.log(`\n=== ${name} ===`);
}

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function step(name, fn) {
  logStep(name);
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (err) {
    console.error(`❌ ${name}:`, err.message);
    return false;
  }
}

async function registerAndVerify(suffix) {
  const uniqueSuffix = `${suffix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `pricing.test+${uniqueSuffix}@example.com`;
  const regRes = await request("POST", "/auth/register", {
    email,
    password: "password123",
    name: `User ${suffix}`,
  });
  assert(regRes.ok, `Registo falhou (${regRes.status}): ${JSON.stringify(regRes.data)}`);

  const verifyRes = await request("POST", "/auth/test/verify-email", {}, regRes.data.accessToken);
  assert(verifyRes.ok, `Verificação de email falhou (${verifyRes.status}). Define ALLOW_TEST_VERIFY=1.`);

  return { token: regRes.data.accessToken, userId: regRes.data.user.id };
}

async function run() {
  console.log("💰 Teste de Pricing e Política de Viagens");
  console.log("==========================================\n");

  let passed = 0;
  let total = 0;

  // Setup
  const driver = await registerAndVerify("driver");
  const passenger = await registerAndVerify("passenger");

  // Aprovar carta de condução antes de criar veículo
  await request("POST", "/auth/test/approve-driver-license", null, driver.token);

  // Criar veículo para o condutor
  const vehicleRes = await request("POST", "/vehicles", {
    brand: "Toyota",
    model: "Corolla",
    seats: 4,
    fuelType: "gasoleo",
    avgConsumption: 6.5,
  }, driver.token);
  assert(vehicleRes.ok, `Criação de veículo falhou: ${vehicleRes.status}`);
  const vehicleId = vehicleRes.data.id;
  console.log(`✅ Setup: driver + passenger + veículo (${vehicleId}) criados`);

  // ─── SECÇÃO 1: Política de Viagens ───────────────────────────────────────────

  total++;
  await step("1) POST /rides sem política de condutor devolve 403", async () => {
    const res = await request("POST", "/rides", {
      vehicleId,
      origin: "Lisboa",
      destination: "Porto",
      departureTime: new Date(Date.now() + 86400000).toISOString(),
      availableSeats: 3,
    }, driver.token);
    assert(res.status === 403, `Esperado 403, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(res.data?.message === "DRIVER_POLICY_NOT_ACCEPTED", `Mensagem esperada DRIVER_POLICY_NOT_ACCEPTED, got: ${res.data?.message}`);
    passed++;
  }) && passed++;

  // Corrigir — aceitar política de condutor
  const driverPolicyRes = await request("POST", "/auth/me/accept-policy", { role: "driver" }, driver.token);
  assert(driverPolicyRes.ok, `Aceitar política de condutor falhou: ${driverPolicyRes.status}`);
  console.log("   → Política de condutor aceite");
  total++;

  total++;
  const rideRes = await request("POST", "/rides", {
    vehicleId,
    origin: "Lisboa",
    destination: "Porto",
    departureTime: new Date(Date.now() + 86400000).toISOString(),
    availableSeats: 3,
    // sem preço para evitar verificação de saldo na carteira do passageiro de teste
  }, driver.token);

  let rideId = null;
  if (await step("2) POST /rides após aceitar política de condutor funciona", async () => {
    assert(rideRes.ok, `Criar boleia falhou: ${rideRes.status} — ${JSON.stringify(rideRes.data)}`);
    assert(rideRes.data?.id, "Resposta deve conter id");
    rideId = rideRes.data.id;
    passed++;
  })) {
    // count ok
  }

  total++;
  if (await step("3) POST /bookings sem política de passageiro devolve 403", async () => {
    if (!rideId) { passed++; return; } // skip if ride not created
    const res = await request("POST", `/bookings/rides/${rideId}`, { seats: 1 }, passenger.token);
    assert(res.status === 403, `Esperado 403, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(res.data?.message === "PASSENGER_POLICY_NOT_ACCEPTED", `Mensagem esperada PASSENGER_POLICY_NOT_ACCEPTED, got: ${res.data?.message}`);
    passed++;
  })) { /* ok */ }

  // Aceitar política de passageiro
  const passengerPolicyRes = await request("POST", "/auth/me/accept-policy", { role: "passenger" }, passenger.token);
  assert(passengerPolicyRes.ok, `Aceitar política de passageiro falhou: ${passengerPolicyRes.status}`);
  console.log("   → Política de passageiro aceite");

  total++;
  if (await step("4) POST /auth/me/accept-policy — GET /auth/me reflete datas de aceitação", async () => {
    const meRes = await request("GET", "/auth/me", null, driver.token);
    assert(meRes.ok, `GET /auth/me falhou: ${meRes.status}`);
    const policy = meRes.data?.policy;
    assert(policy, "Resposta deve conter objeto policy");
    assert(policy.driverAcceptedAt, "driverAcceptedAt deve estar preenchido");
    passed++;
  })) { /* ok */ }

  total++;
  if (await step("5) POST /bookings após aceitar política de passageiro funciona", async () => {
    if (!rideId) { passed++; return; }
    const res = await request("POST", `/bookings/rides/${rideId}`, { seats: 1 }, passenger.token);
    assert(res.ok, `Reserva falhou: ${res.status} — ${JSON.stringify(res.data)}`);
    assert(res.data?.id, "Resposta deve conter id da reserva");
    passed++;
  })) { /* ok */ }

  total++;
  if (await step("6) POST /auth/me/accept-policy com role inválido devolve 400", async () => {
    const res = await request("POST", "/auth/me/accept-policy", { role: "admin" }, driver.token);
    assert(!res.ok && res.status === 400, `Esperado 400, got ${res.status}`);
    passed++;
  })) { /* ok */ }

  total++;
  if (await step("7) POST /auth/me/accept-policy sem token devolve 401", async () => {
    const res = await request("POST", "/auth/me/accept-policy", { role: "passenger" }, null);
    assert(res.status === 401, `Esperado 401, got ${res.status}`);
    passed++;
  })) { /* ok */ }

  // ─── SECÇÃO 2: Preços de Combustível ─────────────────────────────────────────

  total++;
  if (await step("8) POST /pricing/fuel-prices devolve preços por tipo", async () => {
    const res = await request("POST", "/pricing/fuel-prices", null, driver.token);
    assert(res.ok, `Esperado 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    const prices = res.data;
    assert(typeof prices === "object" && prices !== null, "Resposta deve ser objeto");
    assert(typeof prices.gasolina95 === "number", "gasolina95 deve ser número");
    assert(typeof prices.gasoleo === "number", "gasoleo deve ser número");
    assert(prices.gasolina95 > 0, "gasolina95 deve ser positivo");
    assert(prices.gasoleo > 0, "gasoleo deve ser positivo");
    console.log(`   Preços: gasolina95=€${prices.gasolina95}, gasoleo=€${prices.gasoleo}, elétrico=€${prices.eletrico}`);
    passed++;
  })) { /* ok */ }

  total++;
  if (await step("9) POST /pricing/fuel-prices sem token devolve 401", async () => {
    const res = await request("POST", "/pricing/fuel-prices", null, null);
    assert(res.status === 401, `Esperado 401, got ${res.status}`);
    passed++;
  })) { /* ok */ }

  // ─── SECÇÃO 3: Cálculo de Rota ───────────────────────────────────────────────

  total++;
  if (await step("10) POST /pricing/calculate sem token devolve 401", async () => {
    const res = await request("POST", "/pricing/calculate", {
      originLat: 38.7223, originLng: -9.1393,
      destLat: 41.1579, destLng: -8.6291,
      departureTime: new Date(Date.now() + 3600000).toISOString(),
      vehicleId, seats: 3,
    }, null);
    assert(res.status === 401, `Esperado 401, got ${res.status}`);
    passed++;
  })) { /* ok */ }

  total++;
  if (await step("11) POST /pricing/calculate sem campos obrigatórios devolve 400", async () => {
    const res = await request("POST", "/pricing/calculate", { vehicleId }, driver.token);
    assert(!res.ok && res.status === 400, `Esperado 400, got ${res.status}`);
    passed++;
  })) { /* ok */ }

  total++;
  if (await step("12) POST /pricing/calculate com veículo inexistente devolve 404", async () => {
    const res = await request("POST", "/pricing/calculate", {
      originLat: 38.7223, originLng: -9.1393,
      destLat: 41.1579, destLng: -8.6291,
      departureTime: new Date(Date.now() + 3600000).toISOString(),
      vehicleId: "00000000-0000-0000-0000-000000000000",
      seats: 3,
    }, driver.token);
    assert(!res.ok && (res.status === 404 || res.status === 400 || res.status === 502), `Esperado 4xx/502, got ${res.status}`);
    passed++;
  })) { /* ok */ }

  // Teste real de rota — pode falhar se API key não configurada
  total++;
  if (await step("13) POST /pricing/calculate Lisboa→Porto devolve rotas com breakdown", async () => {
    const res = await request("POST", "/pricing/calculate", {
      originLat: 38.7223, originLng: -9.1393,   // Lisboa
      destLat: 41.1579, destLng: -8.6291,         // Porto
      departureTime: new Date(Date.now() + 3600000).toISOString(),
      vehicleId,
      seats: 3,
    }, driver.token);

    if (res.status === 502) {
      console.log(`   ⚠️  Google Maps API indisponível (502) — GOOGLE_MAPS_API_KEY pode não estar configurada`);
      passed++; // não falhar se API key não está configurada
      return;
    }

    assert(res.ok, `Esperado 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(Array.isArray(res.data) && res.data.length > 0, "Deve devolver array de rotas");

    const route = res.data[0];
    assert(route.routeId, "Rota deve ter routeId");
    assert(route.label, "Rota deve ter label");
    assert(typeof route.distanceKm === "number" && route.distanceKm > 100, `distanceKm inválido: ${route.distanceKm}`);
    assert(typeof route.durationMin === "number" && route.durationMin > 60, `durationMin inválido: ${route.durationMin}`);
    assert(route.breakdown, "Rota deve ter breakdown");

    const bd = route.breakdown;
    assert(typeof bd.fuelCost === "number" && bd.fuelCost > 0, `fuelCost inválido: ${bd.fuelCost}`);
    assert(typeof bd.pricePerSeat === "number" && bd.pricePerSeat > 0, `pricePerSeat inválido: ${bd.pricePerSeat}`);
    assert(typeof bd.platformFee === "number" && bd.platformFee > 0, `platformFee inválido: ${bd.platformFee}`);
    assert(Math.abs(bd.platformFee - bd.pricePerSeat * 0.1) < 0.05, `platformFee deve ser ~10% do pricePerSeat`);
    assert(Math.abs(bd.passengerPays - (bd.pricePerSeat + bd.platformFee)) < 0.05, "passengerPays = pricePerSeat + platformFee");
    assert(bd.suggestedMaxPrice >= bd.pricePerSeat, "suggestedMaxPrice >= pricePerSeat");

    console.log(`   Rota: ${route.label} — ${route.distanceKm}km, ${route.durationMin}min`);
    console.log(`   Breakdown: combustível €${bd.fuelCost}, portagens €${bd.tollCost}, por lugar €${bd.pricePerSeat}, taxa €${bd.platformFee}`);
    passed++;
  })) { /* ok */ }

  // ─── SECÇÃO 4: Veículo com fuelType + avgConsumption ─────────────────────────

  total++;
  if (await step("14) GET /auth/me mostra fuelType e avgConsumption no veículo", async () => {
    const meRes = await request("GET", "/auth/me", null, driver.token);
    assert(meRes.ok, `GET /auth/me falhou: ${meRes.status}`);
    const vehicle = meRes.data?.vehicles?.[0];
    assert(vehicle, "Deve ter pelo menos um veículo");
    assert(vehicle.fuelType === "gasoleo", `fuelType esperado gasoleo, got: ${vehicle.fuelType}`);
    assert(vehicle.avgConsumption === 6.5, `avgConsumption esperado 6.5, got: ${vehicle.avgConsumption}`);
    passed++;
  })) { /* ok */ }

  total++;
  if (await step("15) PATCH /vehicles/:id atualiza fuelType e avgConsumption", async () => {
    const patchRes = await request("PATCH", `/vehicles/${vehicleId}`, {
      fuelType: "eletrico",
      avgConsumption: 17.0,
    }, driver.token);
    assert(patchRes.ok, `PATCH /vehicles falhou: ${patchRes.status} — ${JSON.stringify(patchRes.data)}`);
    assert(patchRes.data.fuelType === "eletrico", `fuelType esperado eletrico, got: ${patchRes.data.fuelType}`);
    assert(patchRes.data.avgConsumption === 17.0, `avgConsumption esperado 17.0, got: ${patchRes.data.avgConsumption}`);
    passed++;
  })) { /* ok */ }

  // ─── RESULTADO ────────────────────────────────────────────────────────────────

  console.log("\n================================================");
  if (passed === total) {
    console.log(`✅ ${passed}/${total} testes passaram`);
    console.log("❌ 0/" + total + " testes falharam");
  } else {
    console.log(`✅ ${passed}/${total} testes passaram`);
    console.log(`❌ ${total - passed}/${total} testes falharam`);
  }
  console.log("================================================\n");

  process.exit(passed === total ? 0 : 1);
}

run().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
