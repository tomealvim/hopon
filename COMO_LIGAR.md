# Como ligar o Hopon (desenvolvimento local)

## Resumo rápido
- **Backend**: NestJS na porta **3000**, API em `http://localhost:3000/api/v1`
- **Frontend**: Vite + React na porta **5173** (abre no browser)
- **Base de dados**: SQLite em `backend/prisma/dev.db` (já existe)

---

## Passo a passo

### 1. Backend (primeiro terminal)

```powershell
cd c:\Users\tomea\hopon\backend
npm install
npx prisma generate
npm run dev
```

Quando aparecer algo como `Nest application successfully started`, o backend está no ar.

- **API**: http://localhost:3000/api/v1  
- **Swagger (documentação)**: http://localhost:3000/api/docs  

### 2. Frontend (segundo terminal)

```powershell
cd c:\Users\tomea\hopon
npm install
npm run dev
```

O Vite abre normalmente em http://localhost:5173 — é aí que usas a app no browser.

### 3. Variáveis de ambiente (opcional)

- **Backend**: O ficheiro `backend/.env` já existe com JWT e `DATABASE_URL=file:./dev.db`. Não é preciso alterar para desenvolvimento.
- **Frontend**: Por defeito usa `http://localhost:3000/api/v1`. Se o backend estiver noutra porta/URL, cria na raiz do projeto um ficheiro `.env` com:
  ```
  VITE_API_URL=http://localhost:3000/api/v1
  ```

---

## Testar que está tudo ligado

1. Abre http://localhost:5173
2. Regista um utilizador ou faz login
3. Se conseguires ver o perfil e a Discover, está tudo a comunicar.

Se der erro de rede (CORS ou "Failed to fetch"), confirma que o backend está a correr na porta 3000 e que não tens firewall a bloquear.
