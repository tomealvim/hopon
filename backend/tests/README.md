# Scripts de Teste Manual da API

> ⚠️ Estes são scripts de smoke test manuais (batem num servidor já a correr, não isolados, não correm em CI). Os testes automatizados "reais" do projeto vivem em `src/**/*.spec.ts` (Jest + Supertest, com BD de teste dedicada). Usa esta pasta para validação rápida durante o desenvolvimento, não como prova de cobertura de testes.

Esta pasta contém scripts de teste end-to-end para validar a API do backend. Todos os scripts assumem que o servidor está a correr em `http://localhost:3000`.

## 📋 Scripts Disponíveis

### 1. `test-auth-flow.js` ⭐ **Principal**
**O que faz:** Teste completo e abrangente de autenticação e gestão de perfil.

**Cobertura:**
- ✅ Registo de utilizador (happy path)
- ✅ Validações de registo (password curta, email inválido, campos obrigatórios, email duplicado)
- ✅ Login (sucesso, password errada, email inexistente)
- ✅ GET /auth/me (com token válido, token inválido, sem token)
- ✅ PATCH /auth/me (atualizar nome, username, telefone, contactEmail)
- ✅ Atualização múltipla de campos
- ✅ Verificação de persistência de dados
- ✅ CRUD completo de veículos (`GET/POST/PATCH/DELETE /vehicles`)

**Total:** 20 testes automatizados

**Como usar:**
```bash
cd backend
node tests/test-auth-flow.js
```

**Output esperado:**
- ✅ X/20 testes passaram
- ❌ Y/20 testes falharam (se houver problemas)

---

### 2. `test-auth-basic.js` 🔹 **Básico**
**O que faz:** Teste simples do fluxo básico de autenticação (registo → login → perfil).

**Cobertura:**
- Registo de utilizador
- Login com credenciais
- Obter perfil (GET /auth/me)

**Quando usar:** Para validação rápida após mudanças no código de autenticação.

**Como usar:**
```bash
cd backend
node tests/test-auth-basic.js
```

---

### 3. `test-profile-basic.js` 🔹 **Básico**
**O que faz:** Teste focado na atualização de perfil.

**Cobertura:**
- Registo de utilizador
- Atualizar perfil (nome, telefone, contactEmail, username)
- Verificar persistência via GET /auth/me

**Quando usar:** Para validar mudanças específicas na API de perfil.

**Como usar:**
```bash
cd backend
node tests/test-profile-basic.js
```

---

- Página | `test-vehicles-advanced.js` 🚀 **Avançado**
**O que faz:** Teste dedicado ao CRUD de veículos com múltiplos cenários.

**Cobertura:**
- GET /vehicles sem token → 401
- GET /vehicles vazio
- POST com payload inválido (marca em falta, seats <1) → 400
- POST válido (cria veículos A e B)
- POST sem seats/features aplica defaults corretos
- GET verifica ordenação e dados devolvidos
- PATCH veículo inexistente → 404
- PATCH veículo A (cor + features)
- PATCH parcial mantém features existentes
- DELETE por outro utilizador → 404 (não encontra)
- DELETE veículo B + tentativa de remoção duplicada → 404
- DELETE veículo com defaults
- GET /vehicles com outro utilizador devolve vazio
- GET final confirma persistência das alterações

**Como usar:**
```bash
cd backend
node tests/test-vehicles-advanced.js
```

---

## 🚀 Executar Todos os Testes

Para executar todos os testes de uma vez, podes usar:

```bash
cd backend
node tests/test-auth-flow.js && node tests/test-auth-basic.js && node tests/test-profile-basic.js
```

Ou criar um script no `package.json`:

```json
{
  "scripts": {
    "test:api": "node tests/test-auth-flow.js",
    "test:api:basic": "node tests/test-auth-basic.js && node tests/test-profile-basic.js",
    "test:api:vehicles": "node tests/test-vehicles-advanced.js",
    "test:api:all": "node tests/test-auth-flow.js && node tests/test-auth-basic.js && node tests/test-profile-basic.js && node tests/test-vehicles-advanced.js"
  }
}
```

Depois podes correr:
```bash
npm run test:api         # Fluxo completo Auth + Perfil + Vehicles básicos
npm run test:api:basic   # Testes básicos
npm run test:api:vehicles# Testes avançados de Vehicles
npm run test:api:all     # Todos os testes
```

---

## ⚙️ Pré-requisitos

1. **Backend a correr:** O servidor NestJS deve estar a correr em `http://localhost:3000`
   ```bash
   npm run dev
   ```

2. **Node.js 18+:** Os scripts usam `fetch` global (disponível desde Node 18)
   - Se estiveres em Node 16, instala `node-fetch` e adapta os imports

3. **Base de dados limpa (opcional):** Para testes mais consistentes, podes limpar a BD antes:
   ```bash
   npx prisma migrate reset
   ```

---

## 📊 Interpretação dos Resultados

### ✅ Todos os testes passaram
- A API está a funcionar corretamente
- Podes avançar com confiança

### ❌ Alguns testes falharam
1. **Verifica os logs** acima para ver qual teste falhou
2. **Verifica o backend** está a correr e a responder
3. **Verifica a base de dados** se houver erros de duplicação
4. **Verifica os logs do backend** para erros do servidor

### Erros comuns:
- **401 Unauthorized:** Token inválido ou expirado
- **409 Conflict:** Email/telefone já existe na BD
- **400 Bad Request:** Validação falhou (verificar formato dos dados)
- **Connection refused:** Backend não está a correr

---

## 🔧 Manutenção

### Adicionar novos testes
1. Cria um novo ficheiro `test-*.js` nesta pasta
2. Usa a mesma estrutura dos outros scripts
3. Documenta no README o que o teste cobre

### Atualizar testes existentes
- Se mudares endpoints ou formatos de resposta, atualiza os testes correspondentes
- Mantém os testes sincronizados com a API real

---

## 📝 Notas

- **Dados de teste:** Os scripts criam utilizadores com emails únicos usando timestamps
- **Limpeza:** Os dados de teste ficam na BD (podes limpar manualmente se necessário)
- **Isolamento:** Cada execução cria novos utilizadores, então podes correr múltiplas vezes sem conflitos

