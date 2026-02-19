# Roadmap Hopon

## Como ler este ficheiro
- `[ ]` por iniciar · `[~]` em progresso · `[x]` concluído.
- `(BLOCKED)` indica dependência externa.
- `(F2)` marca itens planeados para fases pós-MVP.
- Tasks estão agrupadas por domínio para facilitar owners.

## Pré-requisitos (bloqueadores)
- [x] Definir stack backend final (NestJS + PostgreSQL + Redis futuro) e documentar decisões.
  - **Decisão:** Node.js LTS (20/22) + TypeScript, NestJS, PostgreSQL, Prisma, Redis (futuro) para OTP/rate limiting/filas.
  - **Motivação:** módulos de NestJS encaixam no roadmap (Auth, Wallet, Rides), traz DI/guards/filters; TypeScript dá tipos end-to-end e alinhamento com frontend; Postgres garante transações e integridade (wallet, reservas); Prisma fornece DX ótima e migrações versionadas; Redis permite OTP com TTL e controlo de tentativas sem necessidade imediata no MVP.
  - **Segurança:** passwords com bcrypt/argon2 no Postgres, OTPs isolados em Redis, rate limiting fácil e validações centralizadas em pipes/guards.
- [x] Escolher hosting inicial (Railway, Render, Fly.io ou VM) e plano de ambientes.
  - **Decisão:** Railway para backend + PostgreSQL (pode migrar mais tarde para Render/Fly/VM).
  - **Motivação:** deploy direto via GitHub, criação de Postgres num clique, logs/dashboards simples; foco em features em vez de DevOps. VM própria adiada para fase com mais tráfego.
  - **Plano:** projetos separados em Railway para `dev`, `staging`, `prod` (cada um com BD própria e backups ativos em produção).
- [~] Configurar ambientes `dev`, `staging`, `prod` com variáveis isoladas.
  - **Decisão:** development local (Docker ou Railway dev), staging deploy de branch `staging`, production a partir de `main`.
  - **Variáveis:** `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWILIO_*` (ou equivalente), `APP_URL` → todas separadas por ambiente; nunca commitar `.env`.
  - **Prática:** manter `.env.example` documentado; gerir secrets via UI/CLI do provider.
- [x] Criar repositório `hopon-backend` com estrutura modular, ESLint/Prettier e scripts (`dev`, `build`, `start`).
  - **Decisão:** repo dedicado com NestJS estruturado por módulos (`modules/auth`, `modules/users`, `modules/wallet`, ...), pasta `common/` para guards/dto/filters, diretório `prisma/` com `schema.prisma`.
  - **Scripts npm:**
    ```json
    {
      "dev": "nest start --watch",
      "build": "nest build",
      "start": "node dist/main.js",
      "start:prod": "NODE_ENV=production node dist/main.js",
      "lint": "eslint \"src/**/*.ts\"",
      "format": "prettier --write \"src/**/*.ts\"",
      "prisma:migrate": "prisma migrate dev",
      "prisma:generate": "prisma generate"
    }
    ```
  - **Motivação:** módulos tornam onboarding simples, ESLint/Prettier asseguram consistência, scripts suportam CI/CD e Railway.
- [x] Estabelecer convenções de API: prefixo `/api/v1`, formato de erro, autenticação Bearer.
  - **Prefixo:** todas as rotas expostas começam em `https://api.hopon.app/api/v1/...` para permitir versionamento futuro.
  - **Erros:** sempre `{ "error": { "code": "AUTH_INVALID_OTP", "message": "...", "details": null } }` com `code` estável; sucesso sempre JSON (`{ "user": {...} }`, `{ "wallet": {...} }`).
  - **Auth:** JWT via header `Authorization: Bearer <token>`, guard NestJS (`JwtAuthGuard`) para rotas privadas, endpoints públicos como `/auth/otp/send` sem auth.

## MVP — Produto & Backend

### 1. Autenticação e Utilizadores
- [x] Modelo `User` em PostgreSQL (id, email, phone, passwordHash, authProvider, createdAt, etc.) — schema criado.
- [x] JWT access token — implementado e funcional.
- [x] JWT refresh token + endpoints `POST /auth/refresh`, `POST /auth/logout` — implementado e testado.
- [x] Middleware/guard que valida JWT e injeta `req.user` nas rotas privadas — `JwtAuthGuard` implementado.

#### 1.1 OTP real (email/SMS) — Validação de Contactos
- [x] Definir fornecedor (Resend para email; em dev telefone recebe código por email).
- [x] `POST /auth/otp/send` para email/telefone com limites (5 envios / 15 min, código válido 5 min).
- [x] `POST /auth/otp/verify` devolvendo perfil atualizado e marcando contacto como verificado.
- [x] Persistir OTPs na BD (modelo `OtpCode`) com TTL e contador de tentativas.
- [x] Atualizar `VerificationSheet` para usar os endpoints reais (mock → real).
- [x] **Validação de telefone via OTP**: Após utilizador adicionar telefone no perfil, enviar OTP (por email em dev).
  - Verificação via `POST /auth/otp/verify` com `purpose: 'phone'`.
  - Marcar `phoneVerifiedAt` no `User` após verificação bem-sucedida.
  - Perfil mostra estado de verificação; `user.verification.phone` no frontend.
  - Bloquear criar boleia, pedir boleia e ver detalhes de boleia até email e telefone verificados (`VerifiedUserGuard`).
- [x] **Validação de email via OTP**: `POST /auth/otp/send` e `POST /auth/otp/verify` com `purpose: 'email'`.
  - Marcar `emailVerifiedAt` no `User` após verificação.
- [x] **Resend (email):** `RESEND_API_KEY` e `RESEND_FROM` em `backend/.env`; sem key o código é logado na consola. Template de referência em `backend/resend-email-example.js` (igual ao `AuthService`).
- [x] **VerifiedUserGuard:** atualmente só exige **email verificado** para criar/pedir boleia e ver detalhes; verificação de telefone fica para quando estiver ativa.
- [x] **Perfil (ProfilePage):** botão "Verificar email" visível quando email não verificado; quando verificado apenas badge "✓ Verificado" (sem emojis); opção "Verificar telemóvel" **desligada no menu por agora**.
- [ ] **Reativar verificação de telemóvel:** quando SMS/telefone estiver implementado, voltar a mostrar o botão "Verificar telemóvel" no perfil e exigir `phoneVerifiedAt` no `VerifiedUserGuard` (ver `backend/src/common/guards/verified-user.guard.ts`).
- [ ] **Validação de email alternativo** (contactEmail): opcional; atualmente verifica-se o email da conta.
- [ ] **Frontend — Seletor de país para telefone** (melhoria UX):
  - Instalar `react-phone-number-input` para seletor elegante de código de país.
  - Substituir inputs simples de telefone em `ProfilePage`, `ProfileSetupPage`, `SupportContactSheet`.
  - Validação em tempo real enquanto utilizador digita.
  - Formatação automática baseada no país selecionado.
- [ ] **Imagens de veículo (F1.5)**:
  - Guardar apenas URL otimizada (upload para storage/API própria) em vez de data URI completos na BD.
  - Limitar tamanho (ex.: 1 MB) e validar no backend.
  - Otimizar/normalizar dimensões antes de guardar (thumb 512px).

#### 1.2 Sign-in com Google e Apple
- [ ] Escolher estratégia (SDK nativo, Firebase/Auth0/Clerk, etc.) e mapear requisitos.
- [ ] Configurar credenciais OAuth (Google Cloud + Apple Developer).
- [ ] Endpoints `POST /auth/google` e `POST /auth/apple` + mapping `providerId → userId`.
- [ ] Chamar providers no frontend (botões já existentes).
- [ ] Fallback: se provider só devolver email, pedir telemóvel para OTP.

#### 1.3 “Forgot password” via OTP
- [ ] Desenhar ecrã “Esqueci a palavra-passe” alinhado com fluxo OTP.
- [ ] Reutilizar envio/validação com scope `reset password`.
- [ ] `POST /auth/password/forgot` e `POST /auth/password/reset`.
- [ ] Após validação, permitir definir nova password e atualizar backend.

### 2. Perfis e Veículos
- [x] Modelo `Profile` (nome, foto, escola, etc.) separado de `User`.
- [x] Modelo `Vehicle` (userId, brand, model, plate hash, seats, ...) — schema criado.
- [x] Endpoints `GET/PATCH /auth/me` — implementados e testados.
- [x] Validação de telefone internacional com `libphonenumber-js` — decorator customizado `@IsValidPhoneNumber()`.
- [x] Campo `contactEmail` no `Profile` — adicionado e funcional.
- [x] CRUD de veículos (`GET /vehicles`, `POST`, `PATCH`, `DELETE /vehicles/:id`) — implementado e testado.
- [ ] Integrar API ViaMichelin para estimar consumo/custos automaticamente (depende da definição final de viagens).

### 3. Schedules, Rides & Bookings
- [x] Modelo `ScheduleTemplate` (horários recorrentes) — schema criado com campos: origin, destination, time (HH:mm), daysOfWeek (JSON), vehicleId, availableSeats, price, active.
- [x] Modelo `Ride` (instância de viagem) + `Booking` (reserva de lugar) — schema criado e implementado.
- [x] Endpoints MVP: `POST /schedules`, `GET /schedules/my`, `GET /schedules/:id`, `PATCH /schedules/:id`, `DELETE /schedules/:id`, `POST /schedules/:id/create-ride` (criar Ride a partir de template).
- [x] Exploração `GET /rides/search` (matching básico) — implementado e público (sem auth).
- [x] Fluxo de reservas: `POST /bookings/rides/:rideId`, `POST /bookings/:id/cancel` — implementado e testado.
- [x] Garantir integridade de lugares (transactions na BD) — implementado com validações e transações.
- [x] **Discover ligada à API:** no separador Explore, boleias carregadas de `GET /rides/search`; cards com condutor (nome, avatar), data/hora, lugares; "Pedir lugar" → `POST /bookings/rides/:rideId`; "Detalhes" → `GET /rides/:id` (condutor + veículo). Ofertas locais (mock) ainda listadas abaixo.

### 4. Wallet / Hopon Cash
- [ ] Definir provider de top-ups (Stripe, Revolut Business, MB Way, etc.) e custos.
- [ ] Modelos `Wallet` (um por user) e `WalletTransaction` (topup, ride_payment, referral_bonus, cashout, ...).
- [ ] Endpoints: `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/topups`.
- [ ] Persistência de métodos + validações Apple Pay / MB Way (tokens, device binding).
- [ ] Webhook `POST /webhooks/stripe` (ou equivalente) para confirmar pagamento e criar `WalletTransaction`.
- [ ] Propagar saldo às viagens (reservas usam Hopon Cash ao confirmar/completar).
- [ ] Ligar `WalletSheet` ao backend (listar métodos reais, criar top-up, mostrar estados pending/success/failure).
- [ ] `POST /wallet/cashout` (F2) mas desenhar contrato já agora.

### 5. Programa de convites / descontos
- [ ] Modelo `ReferralCode` (owner, código, ativo, benefício).
- [ ] Modelo `ReferralReward` ligado à wallet.
- [ ] Endpoints: `GET /referrals/my-code`, `GET /referrals/:code`, `POST /referrals/use`.
- [ ] Regras: quando o desconto aplica (1.º top-up, 1.ª viagem, crédito direto) e limites €/user.
- [ ] Atualizar sheet “Convidar amigos” no `ProfilePage` para consumir endpoints reais (partilha + callbacks).

### 6. Termos & Condições / Legal
- [ ] Rever texto com equipa legal e publicar versão oficial.
- [ ] Modelo `LegalDocument` (type, version, content, publishedAt).
- [ ] Guardar versão aceite (`UserLegalAcceptance`).
- [ ] Endpoints `GET /legal/tos/latest`, `GET /legal/privacy/latest`.
- [ ] Registar versão aceite durante signup.
- [ ] Definir responsável/processo de futuras revisões.

### 7. Contacto / Suporte
- [ ] Modelo `SupportTicket` (userId opcional, contactos, subject, message, status).
- [ ] `POST /support/tickets` com validações (normalizar telefone, guardar prefixo/pais).
- [ ] Frontend "Contacta-nos": seletor de indicativo internacional e UX acessível.
- [ ] (F2) Painel admin: `GET /admin/support/tickets`, `PATCH /admin/support/tickets/:id` para estado/notas.

#### 7.1 Reclamações / Avaliações
- [x] Interface frontend de reclamações (`ComplainPage`) com categorias e formulário.
- [ ] Modelo `Complaint` (userId, rideId opcional, category, message, status, createdAt, resolvedAt).
- [ ] Endpoint `POST /complaints` para enviar reclamações.
- [ ] Endpoint `GET /complaints/my` para utilizador ver histórico de reclamações.
- [ ] Notificações automáticas para equipa (email/Slack) quando reclamação é enviada.
- [ ] (F2) Sistema de avaliações mútuas (condutor ⇄ passageiro) após viagem.
- [ ] (F2) Dashboard admin: gerir reclamações, mudar status, adicionar notas internas.

### 8. Infra / DX (Developer Experience)
- [ ] **CI/CD & Testes:**
  - [ ] Configurar GitHub Actions: Lint + Testes em PRs.
  - [ ] Build backend em main/staging.
  - [ ] Deploy automático para staging; manual para prod.
  - [ ] Definir testes unitários (Jest) para Auth/Wallet e integração para fluxos críticos.
- [ ] **Ambiente Local:**
  - [ ] `docker-compose` com PostgreSQL (+ Redis futuro).
  - [ ] Script `npm run dev:all` para arrancar tudo.
  - [ ] Script de seed/reset de BD.
- [ ] **Documentação de API:**
  - [x] Ativar Swagger/OpenAPI no NestJS — `/api/docs` funcional.
  - [x] Documentar endpoints principais (/auth, /me) — DTOs anotados.
  - [ ] Documentar endpoints de rides/wallet quando implementados.

### 9. Notificações & Comunicação
- [~] **Notification Service (módulo NestJS):**
  - [x] Estrutura básica criada (`NotificationsService`, `NotificationsModule`).
  - [x] Notificação quando boleia é cancelada/apagada (identifica utilizadores afetados).
  - [ ] **Push Notifications (FCM/OneSignal):**
    - [ ] Configurar Firebase Cloud Messaging (FCM) no backend.
    - [ ] Modelo `DeviceToken` na BD (userId, token, platform, createdAt).
    - [ ] Endpoint `POST /notifications/register-token` para guardar FCM token do dispositivo.
    - [ ] Integrar envio de push via FCM quando boleia é cancelada.
    - [ ] Service Worker no frontend para receber notificações em background.
    - [ ] Pedir permissão de notificações ao utilizador (quando fizer login).
    - [ ] Enviar token para backend após login/registo.
  - [ ] **Notificações In-App:**
    - [ ] Modelo `Notification` na BD (userId, type, title, message, read, metadata, createdAt).
    - [ ] Endpoint `GET /notifications/my` para listar notificações do utilizador.
    - [ ] Endpoint `PATCH /notifications/:id/read` para marcar como lida.
    - [ ] Frontend: componente de lista de notificações (badge com contador).
    - [ ] Mostrar notificações in-app quando app está aberta (usar `NotificationContext` existente).
  - [ ] Canais: Email (transacional), SMS (opcional).
  - [ ] Modelo `NotificationPreference` por user (preferências de canais).
- [~] **Gatilhos MVP:**
  - [x] Cancelamento de boleia (estrutura pronta, falta enviar push/in-app).
  - [ ] Nova reserva (notificar condutor).
  - [ ] Confirmação de reserva (notificar passageiro).
  - [ ] Top-up wallet (sucesso/falha).
  - [ ] Reclamações.

### 10. Geo / Mapas / Distâncias
- [ ] **Provider de Mapas:** Escolher (Google Maps, Mapbox, etc.).
- [ ] **Modelo de Localização:** Endereços + lat/lng normalizados.
- [ ] **Serviços:**
  - [ ] Cálculo de distância/duração.
  - [ ] (F2) Ranking de rides por proximidade.

### 11. Segurança / Compliance
- [ ] **Gestão de Sessões:**
  - [ ] Logout global (invalidar refresh tokens).
  - [ ] Expiração curta de JWT + Refresh Token longo.
- [ ] **Auditoria:**
  - [ ] Logs de eventos críticos (login, pagamentos, alterações de perfil).
- [ ] **GDPR:**
  - [ ] Procedimento de eliminação de conta (apagar vs anonimizar).

### 12. Administração / Operações (F2)
- [ ] **Admin Dashboard:**
  - [ ] Ver utilizadores, rides, bookings, wallets.
  - [ ] Bloquear utilizadores (ban).
  - [ ] Gerir reclamações e tickets.
- [ ] **Fraude:**
  - [ ] Limites de contas por telefone/IBAN.
  - [ ] Deteção de abuso em referrals.

### 13. Segurança, logs e backups (Geral)
- [ ] Rate limiting para endpoints sensíveis (`/auth/otp/send`, `/auth/login`, etc.).
- [ ] Logging estruturado para auth, pagamentos e erros críticos.
- [ ] Backups automáticos de PostgreSQL (diário/semanal) + testes de restore.

## Fase 2 e além
- [ ] Cash-out na wallet (`POST /wallet/cashout`) com compliance local.
- [ ] Painel admin de suporte (ver acima).
- [ ] Matching avançado em `GET /rides/search` (rankings, preferências).
- [ ] Integrações adicionais de pagamento (Apple Pay nativo, MB Way direto).
- [ ] Automação de referral rewards (campanhas variáveis).
- [ ] Expansão de logs/observabilidade (tracing distribuído, dashboards).

## Recomendações e pesquisa contínua
- Documentação do fornecedor OTP (Twilio, Firebase, etc.) para limites, preços e anti-fraude.
- UX guidelines para OTP acessível (teclado numérico, auto avanço, colagem).
- Requisitos Apple/Google para “Sign in with Apple” (obrigatório em iOS quando há outros logins).
- Avaliar custos/SLAs dos providers de pagamentos/top-ups.
