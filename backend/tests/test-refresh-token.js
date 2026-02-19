// backend/tests/test-refresh-token.js
/**
 * Testes do fluxo JWT Refresh Token: renovar access token, rotação de refresh token,
 * logout (revogação), e validação de token inválido/ausente/revogado.
 * Requer backend em http://localhost:3000.
 */

const API_BASE = "http://localhost:3000/api/v1";

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

async function run() {
  console.log("🔄 Teste automático de JWT Refresh Token");
  console.log("================================================\n");

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const email = `refresh.test+${randomSuffix}@example.com`;
  const password = "teste123";
  let accessToken = null;
  let refreshToken = null;
  let userId = null;
  let passed = 0;
  let total = 0;

  // ========== SECÇÃO 1: SETUP (REGISTO) ==========

  total++;
  try {
    logStep("1) Registo para obter tokens iniciais");
    const res = await request("POST", "/auth/register", {
      email,
      password,
      name: "Teste Refresh Token",
      phone: null,
    });
    assert(res.ok, "Registo deveria devolver 200/201");
    assert(res.data && res.data.accessToken, "Resposta deve conter accessToken");
    assert(res.data && res.data.refreshToken, "Resposta deve conter refreshToken");
    accessToken = res.data.accessToken;
    refreshToken = res.data.refreshToken;
    userId = res.data.user.id;
    passed++;
    console.log("✅ Registo ok - tokens obtidos");
  } catch (err) {
    console.error("❌ Falha no registo:", err.message);
    console.log("\n================================================");
    console.log(`❌ ${passed}/${total} testes passaram`);
    console.log("================================================\n");
    process.exit(1);
  }

  // ========== SECÇÃO 2: REFRESH TOKEN ==========

  total++;
  let refreshResValid = null;
  try {
    logStep("2) POST /auth/refresh com refresh token válido");
    const oldAccessToken = accessToken;
    const oldRefreshToken = refreshToken;
    const res = await request("POST", "/auth/refresh", {
      refreshToken,
    });
    refreshResValid = res;
    console.log("Status:", res.status);
    console.log("Resposta:", JSON.stringify(res.data, null, 2).substring(0, 200));
    assert(res.ok, "Refresh deveria devolver 200");
    assert(res.data && res.data.accessToken, "Resposta deve conter novo accessToken");
    assert(res.data && res.data.refreshToken, "Resposta deve conter novo refreshToken");
    
    // Debug: verificar se os tokens são diferentes
    if (res.data.accessToken === oldAccessToken) {
      console.log("⚠️  AVISO: AccessToken é igual ao anterior (pode ser normal se gerado no mesmo segundo)");
    }
    if (res.data.refreshToken === oldRefreshToken) {
      console.log("⚠️  ERRO: RefreshToken é igual ao anterior (não deveria acontecer com token rotation)");
    }
    
    assert(res.data.accessToken !== oldAccessToken, `Novo accessToken deve ser diferente. Antigo: ${oldAccessToken.substring(0, 20)}..., Novo: ${res.data.accessToken.substring(0, 20)}...`);
    assert(res.data.refreshToken !== oldRefreshToken, `Novo refreshToken deve ser diferente (token rotation). Antigo: ${oldRefreshToken.substring(0, 20)}..., Novo: ${res.data.refreshToken.substring(0, 20)}...`);
    accessToken = res.data.accessToken; // Atualizar para próximos testes
    refreshToken = res.data.refreshToken; // Atualizar para próximos testes
    passed++;
    console.log("✅ Refresh token ok");
  } catch (err) {
    console.error("❌ Falha no refresh:", err.message);
    if (refreshResValid) {
      console.error("Dados da resposta:", JSON.stringify(refreshResValid.data, null, 2));
    }
  }

  total++;
  try {
    logStep("3) POST /auth/refresh com refresh token inválido");
    const res = await request("POST", "/auth/refresh", {
      refreshToken: "token_invalido_teste",
    });
    console.log("Status:", res.status);
    assert(!res.ok, "Refresh com token inválido NÃO deveria ser 200");
    assert(res.status === 401, "Deveria devolver 401");
    passed++;
    console.log("✅ Validação de token inválido ok");
  } catch (err) {
    console.error("❌ Falha no teste de token inválido:", err.message);
  }

  total++;
  try {
    logStep("4) POST /auth/refresh com refresh token já usado (token rotation)");
    // Guardar o refresh token atual (que foi gerado no teste 2)
    const currentRefreshToken = refreshToken;
    
    // Fazer refresh novamente (deve gerar novos tokens e revogar o atual)
    const res = await request("POST", "/auth/refresh", {
      refreshToken: currentRefreshToken,
    });
    assert(res.ok, "Refresh com token válido deveria funcionar");
    assert(res.data && res.data.refreshToken, "Deveria devolver novo refreshToken");
    
    // Tentar usar o refresh token antigo (já foi revogado)
    const res2 = await request("POST", "/auth/refresh", {
      refreshToken: currentRefreshToken, // Este foi revogado no refresh anterior
    });
    assert(!res2.ok, "Refresh com token revogado NÃO deveria funcionar");
    assert(res2.status === 401, "Deveria devolver 401");
    
    // Verificar que o novo refresh token funciona
    const res3 = await request("POST", "/auth/refresh", {
      refreshToken: res.data.refreshToken, // Novo token do refresh anterior
    });
    assert(res3.ok, "Novo refresh token deveria funcionar");
    
    refreshToken = res3.data.refreshToken; // Atualizar para próximos testes
    accessToken = res3.data.accessToken;
    passed++;
    console.log("✅ Token rotation ok");
  } catch (err) {
    console.error("❌ Falha no teste de token rotation:", err.message);
  }

  total++;
  try {
    logStep("5) POST /auth/refresh sem refresh token");
    const res = await request("POST", "/auth/refresh", {});
    console.log("Status:", res.status);
    assert(!res.ok, "Refresh sem token NÃO deveria ser 200");
    assert(res.status === 400 || res.status === 401, "Deveria devolver 400 ou 401");
    passed++;
    console.log("✅ Validação de token ausente ok");
  } catch (err) {
    console.error("❌ Falha no teste de token ausente:", err.message);
  }

  // ========== SECÇÃO 3: LOGOUT ==========

  total++;
  try {
    logStep("6) POST /auth/logout com token válido");
    const res = await request("POST", "/auth/logout", {
      refreshToken,
    }, accessToken);
    console.log("Status:", res.status);
    assert(res.ok, "Logout deveria devolver 200");
    assert(res.data && res.data.message, "Resposta deve conter mensagem de sucesso");
    passed++;
    console.log("✅ Logout ok");
  } catch (err) {
    console.error("❌ Falha no logout:", err.message);
  }

  total++;
  try {
    logStep("7) POST /auth/refresh após logout (deve falhar)");
    const res = await request("POST", "/auth/refresh", {
      refreshToken, // Token que foi revogado no logout
    });
    console.log("Status:", res.status);
    assert(!res.ok, "Refresh após logout NÃO deveria funcionar");
    assert(res.status === 401, "Deveria devolver 401");
    passed++;
    console.log("✅ Validação de token revogado ok");
  } catch (err) {
    console.error("❌ Falha no teste de token revogado:", err.message);
  }

  total++;
  try {
    logStep("8) POST /auth/logout sem token (logout de todos os dispositivos)");
    // Fazer novo login para ter um token válido
    const loginRes = await request("POST", "/auth/login", {
      email,
      password,
    });
    assert(loginRes.ok, "Login deveria funcionar");
    const newAccessToken = loginRes.data.accessToken;
    const newRefreshToken = loginRes.data.refreshToken;

    // Fazer logout sem especificar refreshToken (revoga todos)
    const res = await request("POST", "/auth/logout", {}, newAccessToken);
    console.log("Status:", res.status);
    assert(res.ok, "Logout sem token deveria devolver 200");
    
    // Verificar que o refresh token foi revogado
    const refreshRes = await request("POST", "/auth/refresh", {
      refreshToken: newRefreshToken,
    });
    assert(!refreshRes.ok, "Refresh após logout global NÃO deveria funcionar");
    passed++;
    console.log("✅ Logout global ok");
  } catch (err) {
    console.error("❌ Falha no teste de logout global:", err.message);
  }

  // ========== SECÇÃO 4: INTEGRAÇÃO COM ACCESS TOKEN ==========

  total++;
  try {
    logStep("9) GET /auth/me com access token após refresh");
    // Fazer novo login
    const loginRes = await request("POST", "/auth/login", {
      email,
      password,
    });
    assert(loginRes.ok, "Login deveria funcionar");
    assert(loginRes.data && loginRes.data.refreshToken, "Login deve devolver refreshToken");
    const newRefreshToken = loginRes.data.refreshToken;

    // Fazer refresh
    const refreshRes = await request("POST", "/auth/refresh", {
      refreshToken: newRefreshToken,
    });
    console.log("Refresh status:", refreshRes.status);
    console.log("Refresh data:", refreshRes.data ? "existe" : "não existe");
    assert(refreshRes.ok, `Refresh deveria funcionar. Status: ${refreshRes.status}, Data: ${JSON.stringify(refreshRes.data)}`);
    assert(refreshRes.data && refreshRes.data.accessToken, "Refresh deve devolver accessToken");
    const refreshedAccessToken = refreshRes.data.accessToken;

    // Usar novo access token para chamar /auth/me
    const meRes = await request("GET", "/auth/me", null, refreshedAccessToken);
    console.log("Status:", meRes.status);
    assert(meRes.ok, "/auth/me deveria funcionar com novo access token");
    assert(meRes.data && meRes.data.email === email, "Deveria devolver dados do utilizador correto");
    passed++;
    console.log("✅ Integração access token após refresh ok");
  } catch (err) {
    console.error("❌ Falha no teste de integração:", err.message);
    if (err.stack) console.error("Stack:", err.stack);
  }

  total++;
  try {
    logStep("10) Múltiplos refreshes consecutivos");
    // Fazer novo login
    const loginRes = await request("POST", "/auth/login", {
      email,
      password,
    });
    assert(loginRes.ok, "Login deveria funcionar");
    assert(loginRes.data && loginRes.data.refreshToken, "Login deve devolver refreshToken");
    let currentRefreshToken = loginRes.data.refreshToken;

    // Fazer 3 refreshes consecutivos
    for (let i = 1; i <= 3; i++) {
      const refreshRes = await request("POST", "/auth/refresh", {
        refreshToken: currentRefreshToken,
      });
      console.log(`Refresh ${i} status:`, refreshRes.status);
      assert(refreshRes.ok, `Refresh ${i} deveria funcionar. Status: ${refreshRes.status}`);
      assert(refreshRes.data && refreshRes.data.refreshToken, `Refresh ${i} deve devolver refreshToken`);
      currentRefreshToken = refreshRes.data.refreshToken;
    }

    // Verificar que o último refresh token ainda funciona
    const finalRefresh = await request("POST", "/auth/refresh", {
      refreshToken: currentRefreshToken,
    });
    assert(finalRefresh.ok, "Último refresh token deveria funcionar");
    passed++;
    console.log("✅ Múltiplos refreshes ok");
  } catch (err) {
    console.error("❌ Falha no teste de múltiplos refreshes:", err.message);
    if (err.stack) console.error("Stack:", err.stack);
  }

  console.log("\n================================================");
  console.log(`✅ ${passed}/${total} testes passaram`);
  console.log("================================================\n");
}

run().catch((err) => {
  console.error("Erro inesperado no script:", err);
  process.exit(1);
});

