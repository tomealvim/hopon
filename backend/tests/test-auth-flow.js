// backend/test-auth-flow.js

// Node 18+ já tem fetch global. Se estiveres em Node 16, instala node-fetch e importa.

const API_BASE = process.env.API_BASE || "http://localhost:3000/api/v1";

// Função helper para gerar números de telefone válidos de diferentes países
function generateUniquePhone() {
  const countries = [
    { code: '+351', pattern: () => `+3519${Math.floor(10000000 + Math.random() * 90000000)}` }, // Portugal
    { code: '+34', pattern: () => `+346${Math.floor(10000000 + Math.random() * 90000000)}` }, // Espanha
    { code: '+33', pattern: () => `+336${Math.floor(10000000 + Math.random() * 90000000)}` }, // França
    { code: '+44', pattern: () => `+447${Math.floor(100000000 + Math.random() * 900000000)}` }, // Reino Unido
    { code: '+55', pattern: () => `+5511${Math.floor(900000000 + Math.random() * 100000000)}` }, // Brasil
  ];
  const country = countries[Math.floor(Math.random() * countries.length)];
  return country.pattern();
}

function logStep(name) {
  console.log(`\n=== ${name} ===`);
}

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) { headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`; }

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

async function run() {
  console.log("🚀 Teste automático completo de Auth + Profile API");
  console.log("================================================\n");

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const email = `hopon.test+${randomSuffix}@example.com`;
  const password = "teste123";
  let accessToken = null;
  let userId = null;
  let lastUpdatedPhone = null; // Para verificar persistência
  let createdVehicleId = null;
  let passed = 0;
  let total = 0;

  // ========== SECÇÃO 1: REGISTO ==========
  
  // 1) Registo happy path
  total++;
  try {
    logStep("1) Registo com email/password válidos");
    const res = await request("POST", "/auth/register", {
      email,
      password,
      name: "Teste Script",
      phone: null,
    });
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "Registo deveria devolver 200/201");
    assert(res.data && res.data.accessToken, "Resposta deve conter accessToken");
    assert(res.data.user && res.data.user.email === email, "Resposta deve conter user com email igual ao enviado");
    accessToken = res.data.accessToken;
    userId = res.data.user.id;
    passed++;
    console.log("✅ Registo ok");
  } catch (err) {
    console.error("❌ Falha no registo:", err.message);
  }

  // 2) Registo com password demasiado curta
  total++;
  try {
    logStep("2) Registo com password curta (esperar 400)");
    const res = await request("POST", "/auth/register", {
      email: `shortpass+${randomSuffix}@example.com`,
      password: "123", // demasiado curta
      name: "Short Pass",
      phone: null,
    });
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "Registo com password curta NÃO deveria ser 200");
    assert(res.status === 400, "Registo com password curta deveria devolver 400");
    passed++;
    console.log("✅ Validação de password curta ok");
  } catch (err) {
    console.error("❌ Falha no teste de password curta:", err.message);
  }

  // 3) Registo com email inválido
  total++;
  try {
    logStep("3) Registo com email inválido (esperar 400)");
    const res = await request("POST", "/auth/register", {
      email: "email-invalido-sem-arroba",
      password: "password123",
      name: "Email Inválido",
      phone: null,
    });
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "Registo com email inválido NÃO deveria ser 200");
    assert(res.status === 400, "Email inválido deveria devolver 400");
    passed++;
    console.log("✅ Validação de email inválido ok");
  } catch (err) {
    console.error("❌ Falha no teste de email inválido:", err.message);
  }

  // 4) Registo com campos obrigatórios faltando
  total++;
  try {
    logStep("4) Registo sem nome (esperar 400)");
    const res = await request("POST", "/auth/register", {
      email: `missingname+${randomSuffix}@example.com`,
      password: "password123",
      // name faltando
    });
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "Registo sem nome NÃO deveria ser 200");
    assert(res.status === 400, "Registo sem nome deveria devolver 400");
    passed++;
    console.log("✅ Validação de campos obrigatórios ok");
  } catch (err) {
    console.error("❌ Falha no teste de campos obrigatórios:", err.message);
  }

  // 5) Registo com email repetido
  total++;
  try {
    logStep("5) Registo com email já existente (esperar 400/409)");
    const res = await request("POST", "/auth/register", {
      email,
      password,
      name: "Duplicado",
      phone: null,
    });
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "Registo com email repetido NÃO deveria ser 200");
    assert(res.status === 400 || res.status === 409, "Email duplicado deveria devolver 400 ou 409");
    passed++;
    console.log("✅ Validação de email duplicado ok");
  } catch (err) {
    console.error("❌ Falha no teste de email duplicado:", err.message);
  }

  // ========== SECÇÃO 2: LOGIN ==========

  // 6) Login com password errada
  total++;
  try {
    logStep("6) Login com password errada (esperar 400/401)");
    const res = await request("POST", "/auth/login", {
      email,
      password: "passwordErrada",
    });
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "Login com password errada NÃO deveria ser 200");
    assert(res.status === 400 || res.status === 401, "Login com password errada deveria devolver 400 ou 401");
    passed++;
    console.log("✅ Validação de login com password errada ok");
  } catch (err) {
    console.error("❌ Falha no teste de login errado:", err.message);
  }

  // 7) Login com email inexistente
  total++;
  try {
    logStep("7) Login com email inexistente (esperar 400/401)");
    const res = await request("POST", "/auth/login", {
      email: `naoexiste+${randomSuffix}@example.com`,
      password: "password123",
    });
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "Login com email inexistente NÃO deveria ser 200");
    assert(res.status === 400 || res.status === 401, "Login com email inexistente deveria devolver 400 ou 401");
    passed++;
    console.log("✅ Validação de login com email inexistente ok");
  } catch (err) {
    console.error("❌ Falha no teste de email inexistente:", err.message);
  }

  // 8) Login com password correta
  total++;
  try {
    logStep("8) Login com password correta");
    const res = await request("POST", "/auth/login", {
      email,
      password,
    });
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "Login com password correta deveria ser 200");
    assert(res.data && res.data.accessToken, "Login deve devolver accessToken");
    accessToken = res.data.accessToken; // Atualizar token
    passed++;
    console.log("✅ Login com password correta ok");
  } catch (err) {
    console.error("❌ Falha no teste de login correto:", err.message);
  }

  // ========== SECÇÃO 3: GET /auth/me ==========

  // 9) /auth/me com token válido
  total++;
  try {
    logStep("9) GET /auth/me com token válido");
    const res = await request("GET", "/auth/me", null, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "/auth/me deveria devolver 200");
    assert(res.data && res.data.email === email, "/auth/me deveria devolver o user correto");
    assert(res.data.profile, "/auth/me deveria incluir profile");
    passed++;
    console.log("✅ /auth/me com token válido ok");
  } catch (err) {
    console.error("❌ Falha no /auth/me válido:", err.message);
  }

  // 10) /auth/me com token inválido
  total++;
  try {
    logStep("10) GET /auth/me com token inválido (esperar 401)");
    const res = await request("GET", "/auth/me", null, "Bearer token_invalido_teste");
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "/auth/me com token inválido NÃO deveria ser 200");
    assert(res.status === 401, "/auth/me com token inválido deveria devolver 401");
    passed++;
    console.log("✅ /auth/me com token inválido ok");
  } catch (err) {
    console.error("❌ Falha no teste de token inválido:", err.message);
  }

  // 11) /auth/me sem token
  total++;
  try {
    logStep("11) GET /auth/me sem token (esperar 401)");
    const res = await request("GET", "/auth/me", null, null);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "/auth/me sem token NÃO deveria ser 200");
    assert(res.status === 401, "/auth/me sem token deveria devolver 401");
    passed++;
    console.log("✅ /auth/me sem token ok");
  } catch (err) {
    console.error("❌ Falha no teste sem token:", err.message);
  }

  // ========== SECÇÃO 4: PATCH /auth/me (EDITAR PERFIL) ==========

  // 12) Atualizar nome
  total++;
  try {
    logStep("12) PATCH /auth/me - Atualizar nome");
    const newName = "João Silva Atualizado";
    const res = await request("PATCH", "/auth/me", { name: newName }, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "PATCH /auth/me deveria devolver 200");
    assert(res.data && res.data.profile && res.data.profile.name === newName, "Nome deveria ter sido atualizado");
    passed++;
    console.log("✅ Atualização de nome ok");
  } catch (err) {
    console.error("❌ Falha na atualização de nome:", err.message);
  }

  // 13) Atualizar username
  total++;
  try {
    logStep("13) PATCH /auth/me - Atualizar username");
    const newUsername = `user_${randomSuffix}`;
    const res = await request("PATCH", "/auth/me", { username: newUsername }, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "PATCH /auth/me deveria devolver 200");
    assert(res.data && res.data.profile && res.data.profile.username === newUsername, "Username deveria ter sido atualizado");
    passed++;
    console.log("✅ Atualização de username ok");
  } catch (err) {
    console.error("❌ Falha na atualização de username:", err.message);
  }

  // 14) Atualizar telefone
  total++;
  try {
    logStep("14) PATCH /auth/me - Atualizar telefone");
    const newPhone = generateUniquePhone(); // Telefone único de país aleatório
    const res = await request("PATCH", "/auth/me", { phone: newPhone }, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "PATCH /auth/me deveria devolver 200");
    assert(res.data && res.data.phone === newPhone, "Telefone deveria ter sido atualizado");
    passed++;
    console.log("✅ Atualização de telefone ok");
  } catch (err) {
    console.error("❌ Falha na atualização de telefone:", err.message);
  }

  // 15) Atualizar contactEmail
  total++;
  try {
    logStep("15) PATCH /auth/me - Atualizar contactEmail");
    const newContactEmail = `contact+${randomSuffix}@example.com`;
    const res = await request("PATCH", "/auth/me", { contactEmail: newContactEmail }, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "PATCH /auth/me deveria devolver 200");
    assert(res.data && res.data.profile && res.data.profile.contactEmail === newContactEmail, "ContactEmail deveria ter sido atualizado");
    passed++;
    console.log("✅ Atualização de contactEmail ok");
  } catch (err) {
    console.error("❌ Falha na atualização de contactEmail:", err.message);
  }

  // 16) Atualizar múltiplos campos de uma vez
  total++;
  try {
    logStep("16) PATCH /auth/me - Atualizar múltiplos campos");
    const updates = {
      name: "Nome Final",
      username: `final_${randomSuffix}`,
      phone: generateUniquePhone(), // Telefone único de país aleatório
      contactEmail: `final+${randomSuffix}@example.com`,
    };
    lastUpdatedPhone = updates.phone; // Guardar para verificar depois
    const res = await request("PATCH", "/auth/me", updates, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "PATCH /auth/me deveria devolver 200");
    assert(res.data && res.data.profile && res.data.profile.name === updates.name, "Nome deveria ter sido atualizado");
    assert(res.data && res.data.phone === updates.phone, "Telefone deveria ter sido atualizado");
    assert(res.data && res.data.profile && res.data.profile.username === updates.username, "Username deveria ter sido atualizado");
    assert(res.data && res.data.profile && res.data.profile.contactEmail === updates.contactEmail, "ContactEmail deveria ter sido atualizado");
    passed++;
    console.log("✅ Atualização múltipla ok");
  } catch (err) {
    console.error("❌ Falha na atualização múltipla:", err.message);
  }

  // 17) Verificar persistência - GET /auth/me depois de atualizar
  total++;
  try {
    logStep("17) Verificar persistência - GET /auth/me após atualizações");
    const res = await request("GET", "/auth/me", null, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "/auth/me deveria devolver 200");
    // Verificar os dados que foram atualizados no teste 16
    assert(res.data && res.data.profile && res.data.profile.name === "Nome Final", "Nome deveria persistir");
    assert(res.data && res.data.phone === lastUpdatedPhone, "Telefone deveria persistir");
    assert(res.data && res.data.profile && res.data.profile.username === `final_${randomSuffix}`, "Username deveria persistir");
    assert(res.data && res.data.profile && res.data.profile.contactEmail === `final+${randomSuffix}@example.com`, "ContactEmail deveria persistir");
    passed++;
    console.log("✅ Persistência de dados ok");
  } catch (err) {
    console.error("❌ Falha na verificação de persistência:", err.message);
  }

  // 18) PATCH /auth/me sem token (esperar 401)
  total++;
  try {
    logStep("18) PATCH /auth/me sem token (esperar 401)");
    const res = await request("PATCH", "/auth/me", { name: "Teste" }, null);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "PATCH /auth/me sem token NÃO deveria ser 200");
    assert(res.status === 401, "PATCH /auth/me sem token deveria devolver 401");
    passed++;
    console.log("✅ PATCH /auth/me sem token ok");
  } catch (err) {
    console.error("❌ Falha no teste sem token:", err.message);
  }

  // 19) PATCH /auth/me com token inválido (esperar 401)
  total++;
  try {
    logStep("19) PATCH /auth/me com token inválido (esperar 401)");
    const res = await request("PATCH", "/auth/me", { name: "Teste" }, "Bearer token_falso");
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(!res.ok, "PATCH /auth/me com token inválido NÃO deveria ser 200");
    assert(res.status === 401, "PATCH /auth/me com token inválido deveria devolver 401");
    passed++;
    console.log("✅ PATCH /auth/me com token inválido ok");
  } catch (err) {
    console.error("❌ Falha no teste de token inválido:", err.message);
  }

  // 20) PATCH /auth/me com body vazio (deveria funcionar, não atualiza nada)
  total++;
  try {
    logStep("20) PATCH /auth/me com body vazio");
    const res = await request("PATCH", "/auth/me", {}, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "PATCH /auth/me com body vazio deveria devolver 200");
    passed++;
    console.log("✅ PATCH /auth/me com body vazio ok");
  } catch (err) {
    console.error("❌ Falha no teste de body vazio:", err.message);
  }

  // ========== SECÇÃO 5: VEHICLE API ==========

  // 21) GET /vehicles (deve estar vazio)
  total++;
  try {
    logStep("21) GET /vehicles (esperar lista vazia)");
    const res = await request("GET", "/vehicles", null, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "GET /vehicles deveria devolver 200");
    assert(Array.isArray(res.data), "GET /vehicles deveria devolver array");
    assert(res.data.length === 0, "Lista de veículos deveria começar vazia");
    passed++;
    console.log("✅ GET /vehicles vazio ok");
  } catch (err) {
    console.error("❌ Falha no GET /vehicles inicial:", err.message);
  }

  // 21b) Aprovar carta de condução (necessário para criar veículos)
  try {
    await request("POST", "/auth/test/approve-driver-license", null, accessToken);
  } catch { /* ignorar se ALLOW_TEST_VERIFY não estiver ativo */ }

  // 22) POST /vehicles - criar veículo
  total++;
  try {
    logStep("22) POST /vehicles - criar veículo");
    const vehiclePayload = {
      brand: "Tesla",
      model: "Model 3",
      plate: "12-AB-34",
      color: "Branco Pérola",
      imageUrl: "https://cdn.hopon.app/vehicles/model-3.png",
      seats: 4,
      features: {
        airConditioning: true,
        heater: true,
      },
    };
    const res = await request("POST", "/vehicles", vehiclePayload, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "POST /vehicles deveria devolver 200/201");
    assert(res.data && res.data.id, "Resposta deve conter veículo com id");
    assert(res.data.features && res.data.features.airConditioning === true, "Features deveriam ser devolvidas");
    createdVehicleId = res.data.id;
    passed++;
    console.log("✅ Criação de veículo ok");
  } catch (err) {
    console.error("❌ Falha na criação de veículo:", err.message);
  }

  // 23) GET /vehicles - deve devolver o veículo criado
  total++;
  try {
    logStep("23) GET /vehicles - verificar veículo criado");
    const res = await request("GET", "/vehicles", null, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "GET /vehicles deveria devolver 200");
    assert(Array.isArray(res.data) && res.data.length === 1, "Deveria existir exatamente 1 veículo");
    assert(res.data[0].id === createdVehicleId, "Veículo devolvido deveria corresponder ao criado");
    passed++;
    console.log("✅ GET /vehicles com dados ok");
  } catch (err) {
    console.error("❌ Falha no GET /vehicles após criação:", err.message);
  }

  // 24) PATCH /vehicles/:id - atualizar veículo
  total++;
  try {
    logStep("24) PATCH /vehicles/:id - atualizar veículo");
    const updatePayload = {
      color: "Preto",
      features: {
        airConditioning: false,
        heater: true,
      },
    };
    const res = await request(
      "PATCH",
      `/vehicles/${createdVehicleId}`,
      updatePayload,
      accessToken,
    );
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "PATCH /vehicles deveria devolver 200");
    assert(res.data && res.data.color === "Preto", "Cor deveria ser atualizada");
    assert(res.data.features && res.data.features.airConditioning === false, "Features deveriam refletir atualização");
    passed++;
    console.log("✅ Atualização de veículo ok");
  } catch (err) {
    console.error("❌ Falha no PATCH /vehicles:", err.message);
  }

  // 25) DELETE /vehicles/:id - remover veículo
  total++;
  try {
    logStep("25) DELETE /vehicles/:id - remover veículo");
    const res = await request("DELETE", `/vehicles/${createdVehicleId}`, null, accessToken);
    console.log("Status:", res.status, "Resposta:", res.data);
    assert(res.ok, "DELETE /vehicles deveria devolver 200");

    const listRes = await request("GET", "/vehicles", null, accessToken);
    assert(listRes.ok, "GET /vehicles após delete deveria devolver 200");
    assert(Array.isArray(listRes.data) && listRes.data.length === 0, "Lista de veículos deveria voltar a ficar vazia");
    passed++;
    console.log("✅ Remoção de veículo ok");
  } catch (err) {
    console.error("❌ Falha no DELETE /vehicles:", err.message);
  }

  // ========== RESUMO FINAL ==========
  
  console.log("\n================================================");
  console.log(`✅ ${passed}/${total} testes passaram`);
  console.log(`❌ ${total - passed}/${total} testes falharam`);
  console.log("================================================\n");

  if (passed === total) {
    console.log("🎉 Todos os testes passaram! A API está funcionando corretamente.");
    process.exit(0);
  } else {
    console.log("⚠️  Alguns testes falharam. Verifica os logs acima.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Erro inesperado no script:", err);
  process.exit(1);
});