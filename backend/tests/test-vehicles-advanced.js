// backend/tests/test-vehicles-advanced.js
/**
 * Testes da API de Veículos (CRUD, permissões, validações).
 * Requer backend em http://localhost:3000. Node 18+ (fetch global).
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000/api/v1";

function logStep(name) {
  console.log(`\n=== ${name} ===`);
}

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
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

async function registerUser(seed) {
  const email = `vehicles.advanced+${seed}@example.com`;
  const password = "Teste123!";
  const payload = {
    email,
    password,
    name: "Vehicle Tester",
    phone: null,
  };
  const res = await request("POST", "/auth/register", payload);
  assert(res.ok, `Registo falhou (${res.status}) ${JSON.stringify(res.data)}`);
  return { token: res.data.accessToken, userId: res.data.user.id, email, password };
}

async function run() {
  console.log("🚗 Teste avançado de Vehicle API");
  console.log("================================================");

  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const { token: userToken } = await registerUser(`u1-${randomSuffix}`);
  const { token: otherUserToken } = await registerUser(`u2-${randomSuffix}`);

  let total = 0;
  let passed = 0;
  let vehicleAId = null;
  let vehicleBId = null;
  let vehicleCId = null;

  async function step(name, fn) {
    total++;
    logStep(`${total}) ${name}`);
    try {
      await fn();
      passed++;
      console.log("✅ OK");
    } catch (err) {
      console.error("❌ Falhou:", err.message);
    }
  }

  await step("GET /vehicles sem token deve falhar", async () => {
    const res = await request("GET", "/vehicles");
    assert(!res.ok && res.status === 401, "Deveria devolver 401");
  });

  await step("GET /vehicles vazio", async () => {
    const res = await request("GET", "/vehicles", null, userToken);
    assert(res.ok, "GET /vehicles deveria devolver 200");
    assert(Array.isArray(res.data) && res.data.length === 0, "Lista dever ser vazia");
  });

  await step("POST /vehicles sem brand deve falhar", async () => {
    const res = await request(
      "POST",
      "/vehicles",
      { model: "SemMarca" },
      userToken,
    );
    assert(!res.ok && res.status === 400, "Deveria devolver 400");
  });

  await step("POST /vehicles com seats inválidos deve falhar", async () => {
    const res = await request(
      "POST",
      "/vehicles",
      { brand: "Tesla", model: "Model X", seats: 0 },
      userToken,
    );
    assert(!res.ok && res.status === 400, "Seats inválidos deveriam falhar");
  });

  await step("POST /vehicles cria veículo A", async () => {
    const payload = {
      brand: "Tesla",
      model: "Model 3",
      plate: "AA-00-AA",
      color: "Branco",
      imageUrl: "https://cdn.hopon.app/vehicles/model-3.png",
      seats: 4,
      features: { airConditioning: true, heater: true },
    };
    const res = await request("POST", "/vehicles", payload, userToken);
    assert(res.ok, "POST deveria devolver 200/201");
    assert(res.data && res.data.id, "Resposta deve conter veículo");
    vehicleAId = res.data.id;
    assert(res.data.features.airConditioning === true, "AC deveria ser true");
  });

  await step("POST /vehicles cria veículo B", async () => {
    const payload = {
      brand: "Volkswagen",
      model: "ID.4",
      plate: "BB-11-BB",
      color: "Azul",
      seats: 5,
      features: { airConditioning: false, heater: true },
    };
    const res = await request("POST", "/vehicles", payload, userToken);
    assert(res.ok, "Criação deveria ser 200");
    vehicleBId = res.data.id;
  });

  await step("GET /vehicles devolve 2 veículos ordenados", async () => {
    const res = await request("GET", "/vehicles", null, userToken);
    assert(res.ok, "GET deveria devolver 200");
    assert(Array.isArray(res.data) && res.data.length === 2, "Devem existir 2 veículos");
    assert(res.data[0].id === vehicleAId, "Primeiro deve ser veículo A");
    assert(res.data[1].id === vehicleBId, "Segundo deve ser veículo B");
  });

  await step("GET /vehicles não mostra veículos de outro utilizador", async () => {
    const res = await request("GET", "/vehicles", null, otherUserToken);
    assert(res.ok, "GET deveria devolver 200");
    assert(
      Array.isArray(res.data) && res.data.length === 0,
      "Outro utilizador não deveria ver veículos alheios",
    );
  });

  await step("POST /vehicles sem seats nem features aplica defaults", async () => {
    const payload = {
      brand: "Renault",
      model: "Clio",
      plate: "CC-22-CC",
    };
    const res = await request("POST", "/vehicles", payload, userToken);
    assert(res.ok, "Criação deveria ser 200");
    vehicleCId = res.data.id;
    assert(res.data.seats === 4, "Seats deveria default para 4");
    assert(
      res.data.features &&
        typeof res.data.features === "object" &&
        res.data.features.airConditioning === true,
      "Features deveriam aplicar defaults",
    );
  });

  await step("PATCH /vehicles/:id inexistente devolve 404", async () => {
    const fakeId = "11111111-1111-1111-1111-111111111111";
    const res = await request(
      "PATCH",
      `/vehicles/${fakeId}`,
      { color: "Verde" },
      userToken,
    );
    assert(!res.ok && res.status === 404, "Deveria devolver 404");
  });

  await step("PATCH /vehicles/:id atualiza veículo A", async () => {
    const res = await request(
      "PATCH",
      `/vehicles/${vehicleAId}`,
      { color: "Preto Fosco", features: { airConditioning: false, heater: false } },
      userToken,
    );
    assert(res.ok, "PATCH deveria devolver 200");
    assert(res.data.color === "Preto Fosco", "Cor deveria ser atualizada");
    assert(res.data.features.airConditioning === false, "AC deveria ser false");
  });

  await step("PATCH parcial não apaga features existentes", async () => {
    const res = await request(
      "PATCH",
      `/vehicles/${vehicleCId}`,
      { color: "Cinzento" },
      userToken,
    );
    assert(res.ok, "PATCH deveria devolver 200");
    assert(
      res.data.features &&
        res.data.features.airConditioning === true &&
        res.data.features.heater === true,
      "Features deveriam manter-se no PATCH parcial",
    );
  });

  await step("Outro utilizador não pode apagar veículo alheio", async () => {
    const res = await request(
      "DELETE",
      `/vehicles/${vehicleAId}`,
      null,
      otherUserToken,
    );
    assert(!res.ok && res.status === 404, "Deveria devolver 404 (não encontrado)");
  });

  await step("DELETE /vehicles/:id remove veículo B", async () => {
    const res = await request("DELETE", `/vehicles/${vehicleBId}`, null, userToken);
    assert(res.ok, "DELETE deveria devolver 200");
    const listRes = await request("GET", "/vehicles", null, userToken);
    assert(listRes.ok, "GET deveria devolver 200");
    assert(listRes.data.length === 2, "Deveriam restar 2 veículos");
  });

  await step("DELETE /vehicles/:id duas vezes devolve 404", async () => {
    const res = await request("DELETE", `/vehicles/${vehicleBId}`, null, userToken);
    assert(!res.ok && res.status === 404, "Segunda remoção deveria falhar");
  });

  await step("DELETE /vehicles/:id remove veículo com defaults", async () => {
    const res = await request("DELETE", `/vehicles/${vehicleCId}`, null, userToken);
    assert(res.ok, "DELETE deveria devolver 200");
  });

  await step("GET /vehicles final confirma veículo A atualizado", async () => {
    const res = await request("GET", "/vehicles", null, userToken);
    assert(res.ok, "GET deveria devolver 200");
    assert(res.data.length === 1, "Deverá restar apenas 1 veículo");
    const vehicle = res.data[0];
    assert(vehicle.color === "Preto Fosco", "Cor persistida incorreta");
    assert(vehicle.features.heater === false, "Heater deveria ser false");
  });

  console.log("\n================================================");
  console.log(`✅ ${passed}/${total} testes passaram`);
  console.log(`❌ ${total - passed}/${total} testes falharam`);
  console.log("================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});

