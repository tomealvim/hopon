# HopOn — Roadmap Técnico

> Documento vivo. Atualizar à medida que os itens são concluídos.

---

## Conceito do produto

**HopOn é uma plataforma de carpooling de partilha de custos.**

O condutor divide os custos reais da viagem (gasolina + portagens) pelos passageiros — não ganha dinheiro, divide despesa. O diferencial é o algoritmo de matching: cada utilizador define o seu horário habitual (ScheduleTemplate), e as boleias que batem certo aparecem automaticamente em "Para Ti".

Pensa nisto como BlaBlaCar diário, não como Uber.

---

## Estado atual da stack

| Componente | Tecnologia | Estado |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind 4 | Sólido |
| Backend | NestJS 10 + TypeScript | Sólido |
| ORM | Prisma + PostgreSQL | Sólido |
| Auth | JWT + Refresh Tokens + OTP | Sólido |
| Rides API | NestJS RidesModule | Funcional |
| Bookings API | NestJS BookingsModule | Funcional |
| Schedules API | NestJS SchedulesModule | Funcional |
| Inbox | Backend real + SSE | Sólido |
| Ratings | Backend + UI | Funcional |
| Wallet | Backend ledger + UI | Funcional (sem gateway de pagamento externo) |
| Geodata | Mapbox autocomplete + Haversine | Funcional |
| Realtime | SSE (message.new, booking.new) | Funcional |

---

## Fase 1 — Fundações ✅ CONCLUÍDA

| # | Item | Estado |
|---|---|---|
| 1.1 | PostgreSQL | ✅ docker compose + prisma migrate |
| 1.2 | Transações bookings | ✅ SELECT FOR UPDATE + cancel atómico |
| 1.3 | Inbox no backend | ✅ Conversation/Message/Participant + InboxModule + SSE |
| 1.4 | Ratings | ✅ POST /ratings + GET /ratings/users/:id + RatingsSheet |

---

## Fase 2 — Produto real

### 2.1 — Geodata estruturada ✅ CONCLUÍDA

- [x] Modelo `Location` (label, lat?, lng?, placeId?, city?)
- [x] `originLocationId` / `destinationLocationId` opcionais na `Ride`
- [x] Backend cria registos `Location` com coordenadas
- [x] Pesquisa por proximidade Haversine (lat/lng/radius)
- [x] Componente `LocationInput` com Mapbox Geocoding API + fallback texto
- [x] `VITE_MAPBOX_TOKEN` em `.env`

> **⚠️ Nota — Mapbox vs Google Places**
> Implementámos com **Mapbox** (50k pedidos/mês grátis, sem cartão). Se escalar ou precisar de
> melhor cobertura de POIs portugueses, migrar para **Google Places API** é simples: substituir
> `fetchSuggestions()` em `LocationInput.tsx` — o resto mantém-se igual.

---

### 2.2 — Realtime SSE ✅ CONCLUÍDA

- [x] `EventsModule` — Subject por utilizador + reference counting
- [x] `GET /events/stream?token=<jwt>` — JWT via query param
- [x] Keep-alive ping a cada 30s
- [x] `message.new` em InboxService → participantes
- [x] `booking.new` em BookingsService → driver
- [x] `SSEContext` no frontend — ligação única, reconnect automático
- [x] InboxContext usa SSE; polling reduzido a 60s (fallback)
- [x] Toast de notificação quando driver recebe reserva

---

### 2.3 — Ledger de Pagamentos ✅ CONCLUÍDA

- [x] Modelo `WalletTransaction` (CREDIT/DEBIT/REFUND/PAYOUT)
- [x] `Wallet.balance` + histórico de transações separado
- [x] `WalletModule`: GET /wallet, GET /wallet/transactions, POST /wallet/topup
- [x] Operações atómicas via `prisma.$transaction`
- [x] WalletSheet integrado com API real

---

### 2.4 — Eliminar mock data / ligar tudo à API ✅ CONCLUÍDA

- [x] `RidesContext` mock eliminado — tudo via API real
- [x] `RidesPage` — "As minhas ofertas" via `GET /rides/mine`, "Os meus pedidos" via `GET /bookings/mine`
- [x] Gestão de bookings pelo driver: aceitar/recusar via `PATCH /bookings/:id/status`
- [x] `DiscoverPage` — só boleias da API, mock removido

---

### 2.5 — "Para Ti" com ScheduleTemplates ✅ CONCLUÍDA

- [x] `GET /rides/for-you` — cruza ScheduleTemplates do user com rides disponíveis
- [x] Query: `daysOfWeek` overlap + `departureTime` hora ±30min + Haversine origem/destino
- [x] Tab "Para Ti" no frontend consome a API real
- [x] Badge "Match perfeito" / "Match parcial" conforme critérios

---

### 2.6 — Calculadora de custo por viagem ✅ CONCLUÍDA

- [x] Distância calculada via Haversine quando coordenadas disponíveis
- [x] Preço sugerido: `(distância_km × 0.06€) ÷ nº_lugares`
- [x] Campo portagens manual — somado ao custo total
- [x] Condutor pode ajustar o preço sugerido
- [x] Preço/lugar exibido no card da boleia no Discover

---

### 2.7 — Fluxo de pagamento real ✅ CONCLUÍDA

- [x] Quando passageiro faz booking: debitar `price × seats` da sua wallet (DEBIT, reference=bookingId)
- [x] Quando viagem é concluída (status COMPLETED): creditar condutor (CREDIT, reference=rideId)
- [x] Se booking cancelado: reembolsar passageiro (REFUND, reference=bookingId)
- [x] Verificar saldo antes de confirmar booking — lançar erro se insuficiente
- [x] UI: mostrar custo na RequestSeatSheet antes de confirmar

---

### 2.8 — Trust & Safety ✅ CONCLUÍDA

- [x] `isIdentityVerified` no User
- [x] Modelo `Report` — denúncias entre utilizadores (userId, targetId, reason, details)
- [x] Endpoint `POST /reports`
- [x] Badge "Verificado" nos perfis e nos cards de condutor
- [x] Admin: listar reports e suspender utilizadores (suspendedAt, suspensionReason)

---

### 2.9 — BullMQ — emails assíncronos ✅ CONCLUÍDA

- [x] `@nestjs/bullmq` + `bullmq` instalados
- [x] `BullModule.forRootAsync` global em AppModule (REDIS_URL)
- [x] `NotificationsProcessor` — `@Processor('email')` com switch por job name
- [x] Jobs: `email.otp`, `email.booking-created`, `email.booking-confirmed`, `email.booking-declined`, `email.booking-cancelled`, `email.ride-cancelled`
- [x] `NotificationsService` despacha jobs; AuthService e BookingsService usam-no
- [x] Fallback `logger.log` quando `RESEND_API_KEY` não está definida

---

## Fase 3 — Scale & Operação ✅ CONCLUÍDA

- [x] Cache Redis (`CacheModule`) para `/rides/search` e `/rides/for-you` — TTL 30s/60s
- [x] Job queue (BullMQ) para emails/notificações assíncronos
- [x] Object storage MinIO/S3 para avatars — `POST /auth/me/avatar`
- [x] Cloudflare R2 em produção — bucket `hopon-avatars`, URL pública `pub-*.r2.dev`, testado end-to-end
- [x] Observabilidade: pino structured logging + Sentry (SENTRY_DSN)
- [x] Rate limiting por IP — global 60/min, auth 5/15min, OTP 3/15min
- [x] CI/CD GitHub Actions — backend build+test + frontend build em cada push

---

---

## Fase 4 — Notificações, PWA e Perfil Público ✅ CONCLUÍDA

| # | Item | Estado |
|---|---|---|
| 4.1 | In-app notifications | ✅ Modelo Notification + NotificationsModule + NotificationsSheet |
| 4.2 | Perfil público | ✅ GET /users/:id + PublicProfileSheet + ratings agregadas |
| 4.3 | — | — |
| 4.4 | Histórico de boleias | ✅ GET /rides/history + HistorySheet no ProfilePage |
| 4.5 | PWA | ✅ vite-plugin-pwa (injectManifest) + manifest + icon.svg + meta tags |
| 4.6 | Push notifications | ✅ web-push VAPID + PushService + sw.ts (push handler) + usePushNotifications |

---

## Fase 5 — Polimento e Features Avançadas

| # | Item | Estado |
|---|---|---|
| 5.1 | Fluxo de avaliação pós-viagem | ✅ GET /ratings/pending + SSE ride.competed + botões "Avaliar" em RidesPage |
| 5.2 | Templates de email HTML | ✅ Layout HTML com branding HopOn, estilos inline, 6 templates |
| 5.3 | Auto-geração de boleias por template (cron) | ✅ @nestjs/schedule cron diário às 06:00, POST /scheduler/trigger para teste |
| 5.4 | Invalidação de cache nas mutações | ✅ cache.clear() após create/remove/complete em rides.service |
| 5.5 | Filtros avançados na Discover | ✅ Data, hora, preço máx, lugares, verificados — chips de filtros ativos |
| 5.6 | No-show flow | ✅ arrivedAt + POST /rides/:id/arrive + PATCH booking NO_SHOW + payout inclui no-shows |
| 5.7 | Penalização temporal de cancelamento | ✅ >24h=100%, 2–24h=50%, <2h=0% — UI contextual em RidesPage + RequestSeatSheet |

---

## Fase 6 — Deploy & Testes E2E

| # | Item | Estado |
|---|---|---|
| 6.1 | Deploy Railway (backend) + Vercel (frontend) | ✅ Railway + Vercel configurados, CI/CD automático via push para main |
| 6.2 | Testes E2E contra produção | ✅ Suite completa 7/7 passou contra Railway; DB verify 19/19 |
| 6.3 | Throttler ajustado para testes | ✅ 300 req/min (era 60) — protege contra abuso sem bloquear suite de testes |
| 6.4 | Cloudflare R2 para avatars em produção | ✅ Bucket criado, env vars no Railway, upload testado end-to-end — `test-avatar-upload.mjs` |
| 6.5 | Push notifications em produção | ✅ VAPID keys corretas no Railway, `SubscribeDto` fix (`@IsString`), flow end-to-end testado — booking dispara push ao driver |

### Detalhes — 6.2 Testes E2E

- `API_BASE` configurável via env var em todos os ficheiros de teste
- `test-auth-basic.js` e `test-profile-basic.js` migrados de `http` module para `fetch`
- `test-rides-bookings-advanced.js`: fix de 2 bugs (reset de status e preço após testes PATCH)
- `test-db-verify.js`: novo script — verifica consistência da BD ponta-a-ponta via API (user → veículo → boleia → reserva → inbox → notificações)
- `ALLOW_TEST_VERIFY=1` adicionado ao Railway para ativar endpoint de verificação de email em testes

**Scripts disponíveis:**
```bash
cd backend
npm run test:api:all          # suite completa contra localhost
npm run test:api:prod         # suite completa contra Railway
npm run test:db:verify        # DB verify contra localhost
npm run test:db:verify:prod   # DB verify contra Railway
```

---

## Fase 7 — Stripe, Verificação de Identidade, Disputas ✅ CONCLUÍDA

| # | Item | Estado |
|---|---|---|
| 7.1 | Stripe Payment Element | ✅ StripeModule + `POST /wallet/topup/intent` + webhook `payment_intent.succeeded` + WalletSheet com Elements |
| 7.2 | Verificação de identidade (manual) | ✅ Upload doc → admin aprova/rejeita + IdentityVerificationSheet + secção no ProfilePage |
| 7.3 | Disputas pós-viagem | ✅ DisputesModule + `POST /disputes` + admin resolve com refund opcional + DisputeSheet + botão "Contestar" em HistorySheet |

### Detalhes — 7.1 Stripe

- `POST /wallet/topup/intent` → cria PaymentIntent Stripe → devolve `{ clientSecret, publishableKey }`
- Frontend: `Elements` + `PaymentElement` (Card, MB Way, Apple Pay, Google Pay automático por país/device)
- Webhook `POST /stripe/webhook` (raw body via `express.raw()` antes do JSON parser global)
- Idempotência: `WalletTransaction.reference = pi_xxx` — duplicado ignorado
- Apple Pay domain verification: `GET /.well-known/apple-developer-merchantid-domain-association` (APPLE_PAY_DOMAIN_ASSOCIATION env var)

### Detalhes — 7.2 Verificação de Identidade

- Schema: `identityDocumentUrl`, `identityDocumentType`, `identityDocumentStatus` (NONE/PENDING/VERIFIED/REJECTED) no User
- `POST /auth/me/identity-document?type=cc|passport|driving_license` — FileInterceptor 10MB
- S3 key: `identity/{userId}/{uuid}.{ext}`
- Admin: `GET /admin/verifications/pending`, `PATCH /admin/users/:id/verify`, `POST /admin/users/:id/verify/reject`
- Notificação in-app na aprovação e rejeição

### Detalhes — 7.3 Disputas

- Janela de 7 dias após partida, só boleias COMPLETED, só passageiro pode contestar
- Motivos: WRONG_AMOUNT, NO_SHOW, SAFETY, SERVICE_QUALITY, OTHER
- Admin: `GET /admin/disputes?status=OPEN`, `PATCH /admin/disputes/:id` (REFUND|DISMISS)
- Refund credita wallet do passageiro + notificação

### Env vars novas
```
# backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APPLE_PAY_DOMAIN_ASSOCIATION=<conteúdo do ficheiro do Stripe Dashboard>

# .env (frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Passos de configuração Stripe
1. Criar conta Stripe → obter `sk_test_` e `pk_test_`
2. Stripe Dashboard → Developers → Webhooks → Add endpoint → `https://<backend>/api/v1/stripe/webhook` → evento `payment_intent.succeeded` → copiar `whsec_`
3. Para MB Way: ativar no Dashboard em Portugal
4. Para Apple Pay: Stripe Dashboard → Settings → Payment methods → Apple Pay → Domain verification → descarregar ficheiro e definir `APPLE_PAY_DOMAIN_ASSOCIATION`
5. Testar com `4242 4242 4242 4242` (Visa) ou Stripe test cards para MB Way

---

## Fase 8 — Ciclo de Dinheiro Completo

> O Stripe foi integrado (7.1) mas o ciclo ainda tem lacunas: a comissão HopOn não é retida, condutores não podem sacar, e passageiros não podem pedir reembolso do saldo não usado.

| # | Item | Estado |
|---|---|---|
| 8.1 | Comissão HopOn retida no payout | ✅ Concluído |
| 8.2 | Payout aos condutores (saque para IBAN) | ✅ Concluído (MVP manual) |
| 8.3 | Levantamento de saldo pelos passageiros | ✅ Concluído |
| 8.4 | Deploy Stripe em produção (Railway + Vercel + webhook) | ✅ Concluído |
| 8.5 | Pay-per-ride: pagamento direto na reserva | ✅ Concluído — testado 9/9 |

---

### 8.1 — Comissão HopOn retida no payout ✅

**Implementado:**
- Passageiro paga `(price + platformFee) × seats` ao fazer reserva
- Condutor recebe `price × seats` ao concluir boleia
- HopOn retém `platformFee × seats` (diferença fica no sistema)
- Todos os reembolsos (cancel, declined, pending-on-complete, driver-cancels-ride) corrigidos para devolver `(price + platformFee) × seats`

---

### 8.2 — Payout aos condutores (saque para IBAN) ✅ MVP

**Implementado (Opção A — manual):**
- `POST /wallet/payout-request { amount, iban }` — reserva saldo imediatamente (PAYOUT_PENDING) e regista pedido
- `GET /wallet/payout-requests` — histórico do utilizador
- `GET /admin/payout-requests?status=PENDING` — admin lista pedidos
- `PATCH /admin/payout-requests/:id { status, adminNote }` — admin aprova/processa/rejeita; rejeição devolve saldo
- Frontend: botão "Pedir saque para IBAN" na WalletSheet (visível quando saldo ≥ €1) → `PayoutRequestSheet`
- Notificações in-app ao condutor em cada mudança de estado
- Modelo `PayoutRequest` no Prisma + migração `20260303000003_add_payout_requests`

**Próxima fase (quando houver volume):** migrar para Stripe Connect Express para transferências automáticas.

---

### 8.3 — Levantamento de saldo pelos passageiros ✅

**Implementado:**
- `POST /wallet/withdraw { amount }` — valida saldo e créditos Stripe disponíveis
- Plano de reembolso greedy (mais antigas primeiro) usando `WalletTransaction.reference = pi_xxx`
- Reembolsos parciais/totais via `stripe.refunds.create({ payment_intent, amount })` — Stripe devolve ao cartão original
- Debit atómico da wallet + transações `WITHDRAW` (tipo novo) com reference=pi_ para rastreio
- Frontend: `WithdrawSheet.tsx` (valor, atalhos, success state) + botão "Reembolsar para cartão" na WalletSheet
- Erros claros: se não há créditos Stripe (saldo ganho como condutor) → sugere pedir saque para IBAN

---

### ⚠️ Para testar localmente (fazer sempre antes de arrancar o backend)

**PowerShell — abrir um terminal separado e correr:**
```powershell
# Arrancar o webhook listener do Stripe (manter aberto durante os testes)
Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter "stripe.exe" -Recurse | Select-Object -First 1 | ForEach-Object { & $_.FullName listen --forward-to localhost:3000/api/v1/stripe/webhook }
```

> O terminal mostra `> Ready! Your webhook signing secret is whsec_...` e fica a ouvir.
> **Não fechar este terminal** enquanto testares pagamentos — sem ele os topups via Stripe não creditam a wallet.

**Depois noutra janela, arrancar o backend normalmente:**
```bash
cd backend && npm run dev
```

**Testar a integração Stripe (suite completa 9/9):**
```bash
cd backend && node tests/test-stripe.mjs
```

**Cartão de teste:** `4242 4242 4242 4242` · data futura qualquer · CVC qualquer

---

### 8.4 — Deploy Stripe em produção

**Checklist Railway (backend):**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   ← novo endpoint de produção no Stripe Dashboard
```

**Checklist Vercel (frontend):**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Webhook de produção:**
Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://hopon-production-5bd2.up.railway.app/api/v1/stripe/webhook`
- Eventos: `payment_intent.succeeded`

**Apple Pay em produção:**
Stripe Dashboard → Settings → Payment methods → Apple Pay → Register domain → descarregar ficheiro → `APPLE_PAY_DOMAIN_ASSOCIATION` no Railway

**Ativar conta Stripe (fase protótipo → produção):**

Passo 1 — Buscar keys de TESTE (fazer amanhã, 5 min):
1. Stripe Dashboard → modo Test ativo (toggle no canto superior esquerdo)
2. Developers → API keys → copiar `sk_test_...` e `pk_test_...`
3. Colar em `backend/.env`: `STRIPE_SECRET_KEY=sk_test_...` e `STRIPE_PUBLISHABLE_KEY=pk_test_...`
4. Criar webhook local: `stripe listen --forward-to localhost:3000/api/v1/stripe/webhook` → copiar `whsec_...` → `STRIPE_WEBHOOK_SECRET=whsec_...`
5. Testar com cartão `4242 4242 4242 4242`, qualquer data futura, qualquer CVC
→ **Não é necessário ativar a conta nem ter empresa para este passo.**

Passo 2 — Ativar conta para pagamentos reais (quando houver beta users):
- Ir a "Activate your account" no Stripe Dashboard
- Selecionar **Individual** (não "Company") — não precisas de empresa constituída
- Preencher com NIF pessoal (não NIPC), nome próprio, morada pessoal, IBAN pessoal
- Processo de aprovação: 1-3 dias úteis
- Só depois disto é que os pagamentos reais chegam à conta bancária

---

## Fase 9 — Matching & Descoberta

| # | Item | Estado |
|---|---|---|
| 9.1 | Schedule matching "Para Ti" — passageiros guardam rota habitual | ✅ Concluído |
| 9.2 | Admin UI — painel web para payout requests, disputas, verificações | ✅ Concluído |
| 9.3 | Recurring rides — boleias criadas automaticamente 7 dias à frente | ✅ Concluído |
| 9.4 | Notificações push melhoradas — lembrete 1h antes | ✅ Concluído |

---

### 9.1 — Schedule Matching "Para Ti" ✅

**Implementado:**
- Modelo `UserRoute` — passageiro guarda rota habitual sem precisar de veículo (origin, destination, departTime "HH:mm", daysOfWeek)
- `POST /user-routes` / `GET /user-routes` / `DELETE /user-routes/:id`
- `findForUser` atualizado: usa **ScheduleTemplate** (driver templates) + **UserRoute** (passenger routes) — normaliza ambos para o mesmo formato de "padrão" e corre o algoritmo de matching único
- Algoritmo: dia da semana + hora ±30 min + **Haversine 5km** (quando ambos têm GPS) ou text overlap normalizado + score acumulado por padrão
- `GeocodingService` partilhado (Google Maps API) — geocodifica texto automaticamente em UserRoutes, Rides e Schedules
- Cache Redis com TTL existente mantida
- Frontend:
  - `SaveRouteSheet.tsx` — form: origem (LocationInput Mapbox + botão "Usar localização atual" GPS), destino, hora, dias da semana
  - "Para Ti" tab: lista das rotas guardadas com botão "Apagar" + botão "+ Adicionar"
  - Empty state: botão "Guardar rota habitual" (em vez de "vai à aba Rides")
  - Após guardar/apagar rota: reload automático das sugestões

---

### 9.2 — Admin UI ✅

**Implementado:**
- `AdminPanel.tsx` — Sheet acessível na ProfilePage (só visível para `user.isAdmin === true`)
- 3 abas: **Saques** / **Disputas** / **Identidade**
- **Saques**: filtro por estado (PENDING/APPROVED/PROCESSED/REJECTED) + aprovar / marcar como processado / rejeitar com nota opcional
- **Disputas**: filtro por estado (OPEN/RESOLVED/DISMISSED) + reembolsar (com valor) / descartar com nota de resolução
- **Identidade**: lista de verificações pendentes + visualizador de documento (lightbox) + aprovar / rejeitar
- `isAdmin` adicionado ao tipo `User` no frontend (já era devolvido pela API via spread em `buildUserResponse`)
- Corrigidos erros de build pré-existentes em `IdentityVerificationSheet.tsx` e `RequestSeatSheet.tsx`

---

### 9.3 — Recurring rides ✅

**Implementado:**
- `generateUpcomingRides` cron (06:00 diário, Europe/Lisbon) — cria boleias para os **próximos 7 dias** (era só hoje)
- Para cada template ativo: itera os 7 dias seguintes, verifica se o dia bate com `daysOfWeek`, verifica duplicado, cria ride com Location GPS (geocoding automático)
- Notificação ao condutor apenas para o dia de hoje (evita spam para dias futuros)
- Ignora horas de partida já passadas
- `POST /scheduler/trigger` — aciona manualmente para testes

### 9.4 — Lembretes 1h antes ✅

**Implementado:**
- `sendRideReminders` cron (cada 5 minutos) — encontra boleias SCHEDULED que partem entre 55 e 65 min
- Anti-duplicado via Redis cache: chave `reminder:{rideId}` com TTL 3h
- Passageiros CONFIRMED recebem: "A tua boleia parte em 1 hora — {origem} → {destino} às {hora}"
- Condutor recebe (se houver passageiros): "A tua boleia parte em 1 hora — N lugares reservados"
- `POST /scheduler/trigger-reminders` — aciona manualmente para testes

---

## Fase 10 — Design & Infraestrutura Beta

| # | Item | Estado |
|---|---|---|
| 10.1 | Redesign white + preto minimal | ✅ Concluído |
| 10.2 | Migrar frontend Vercel → Railway | ✅ Concluído — hopon.up.railway.app |
| 10.3 | Reset DB (limpar dados de teste) | ✅ Concluído |
| 10.4 | Configurar domínio personalizado | ⏳ Opcional |

### Testar no telemóvel (PWA) — recomendado

Instalar como PWA para ter experiência idêntica a app nativa (sem barra do browser):

**iPhone:**
1. Abrir `hopon.up.railway.app` no **Safari**
2. Botão de partilha (⬆️) → **"Adicionar ao ecrã inicial"**

**Android:**
1. Abrir `hopon.up.railway.app` no **Chrome**
2. Menu `⋮` → **"Adicionar ao ecrã inicial"** (ou aceitar o banner automático)

A app fica no ecrã inicial com ícone próprio e abre em fullscreen — sem barra do browser.

---

### 10.1 — Redesign white + preto minimal ✅

- Eliminados todos os gradientes (botões, FAB, avatares, badges, inputs)
- Paleta: branco `#FFFFFF` + preto `#111827` como único acento
- Botão primary: preto sólido + texto branco (antes: gradiente beige→mauve)
- Badges com fundo sólido e alto contraste (antes: transparências white/10 invisíveis)
- BottomNav FAB: preto sólido
- DiscoverTopBar: underline no tab ativo, sem pills
- Mensagens próprias no inbox: preto sólido
- Focus rings: cinzento escuro (antes: rosa #FF719A)
- Commits: `design: redesign white + preto minimal`

---

### 10.2 — Migrar frontend Vercel → Railway ⏳

**Objetivo:** tudo numa plataforma só — menos contas, menos configs, logs centralizados.

**`railway.json` criado na raiz do repo:**
```json
{
  "build": { "builder": "NIXPACKS", "buildCommand": "npm ci && npm run build" },
  "deploy": { "startCommand": "npx serve -s dist -l $PORT" }
}
```

**Passos para concluir:**
1. Railway Dashboard → projeto HopOn → **New Service** → **GitHub Repo** → `hopon`
2. Root Directory: deixar vazio (raiz `/`)
3. Adicionar env vars de build (ver secção abaixo)
4. Deploy → aguardar build
5. Settings → Networking → **Generate Domain** para URL público
6. Vercel Dashboard → Settings → **Delete Project**
7. Atualizar `VITE_API_URL` se o URL do backend mudar

**Env vars obrigatórias no serviço frontend do Railway:**
```
VITE_API_URL=https://hopon-production-5bd2.up.railway.app/api/v1
VITE_MAPBOX_TOKEN=pk.xxx...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...
```

---

### 10.3 — Reset DB (limpar dados de teste) ⏳

Railway Dashboard → serviço **PostgreSQL** → aba **Query**:

```sql
TRUNCATE TABLE "User" CASCADE;
```

Apaga tudo em cascata (utilizadores, boleias, reservas, wallets, mensagens, notificações). Schema mantém-se intacto.

---

## Fase 11 — Social Login (Google + Apple)

| # | Item | Estado |
|---|---|---|
| 11.1 | Google Sign-In | ✅ Concluído |
| 11.2 | Apple Sign-In | ⏳ Pendente (App Store obrigatório; requer Apple Developer Account $99/ano) |

### 11.1 — Google Sign-In ✅

**Implementado:**
- `passport-google-oauth20` + `GoogleStrategy` em `auth/strategies/google.strategy.ts`
- `GET /auth/google` → redirect OAuth para o Google
- `GET /auth/google/callback` → find-or-create user → redirect para `FRONTEND_URL/auth/callback?token=...&refresh=...`
- Email marcado como verificado automaticamente (o Google já verificou)
- Se conta com mesmo email já existe → liga o `googleId` e importa avatar do Google (se ainda não tiver)
- `AuthContext` deteta `?token=&refresh=` no URL ao carregar, guarda no localStorage e limpa a URL
- Botão Google com logo SVG multicolor na AuthPage; botão Apple removido

**Env vars obrigatórias:**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://hopon-production-5bd2.up.railway.app/api/v1/auth/google/callback
```

**Configurar no Google Cloud Console:**
1. console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Application type: **Web application**
3. Authorized redirect URIs:
   - `http://localhost:3000/api/v1/auth/google/callback` (local)
   - `https://hopon-production-5bd2.up.railway.app/api/v1/auth/google/callback` (produção)
4. Copiar Client ID e Client Secret → `backend/.env` + Railway env vars

---

### 11.2 — Apple Sign-In

**Backend:**
- `passport-apple` + certificados Apple
- `POST /auth/apple/callback` (Apple usa POST, não GET)
- Env vars: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`

**Frontend:**
- Botão "Apple" na AuthPage usa Apple JS SDK ou redireciona para `/auth/apple`

**Pré-requisitos:**
- Apple Developer Account ($99/ano obrigatório)
- App ID com "Sign in with Apple" capability
- Service ID + domínio verificado
- Key gerada no Apple Developer Portal

> ⚠️ Apple Sign-In é obrigatório nas App Stores se a app oferecer outros social logins. Para PWA/web é opcional.

---

## Fase 12 — App Store (iOS) + Google Play (Android)

> O projeto já tem Capacitor configurado. Os scripts `cap:ios` e `cap:android` já existem no `package.json`.

| # | Item | Estado |
|---|---|---|
| 12.1 | Preparar assets nativos (ícones + splash) | ⏳ Pendente |
| 12.2 | Adaptar UI para safe areas (notch, home bar) | ⏳ Pendente |
| 12.3 | Push notifications nativas (Capacitor) | ⏳ Pendente |
| 12.4 | Política de privacidade + Termos de uso | ⏳ Pendente |
| 12.5 | Submeter na App Store (iOS) | ⏳ Pendente |
| 12.6 | Submeter no Google Play (Android) | ⏳ Pendente |

---

### Pré-requisitos e custos

| Requisito | Custo | Notas |
|---|---|---|
| Apple Developer Account | **$99/ano** | Obrigatório para iOS. Partilhado com Apple Sign-In (Fase 11) |
| Google Play Developer Account | **$25 (taxa única)** | Obrigatório para Android |
| Mac com Xcode | — | Obrigatório para build iOS. Não é possível fazer build iOS no Windows |
| Android Studio | Grátis | Para build Android (também funciona no Windows) |

---

### 12.1 — Assets nativos

- Ícone: **1024×1024px** PNG sem transparência (iOS) e vários tamanhos (Android)
- Splash screen: fundo branco com logo centrado
- Ferramenta recomendada: `@capacitor/assets` — gera todos os tamanhos automaticamente a partir de 1 ficheiro

```bash
npm install @capacitor/assets --save-dev
npx capacitor-assets generate
```

---

### 12.2 — Safe areas

Adicionar ao CSS global para respeitar notch e home bar:
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

E no `capacitor.config.ts`:
```ts
ios: { contentInset: 'always' }
```

---

### 12.3 — Push notifications nativas

Substituir o web-push atual por `@capacitor/push-notifications` para notificações nativas iOS/Android:
```bash
npm install @capacitor/push-notifications
```
- iOS: requer certificado APNs no Apple Developer Portal
- Android: usa Firebase Cloud Messaging (FCM) — criar projeto no Firebase

---

### 12.4 — Política de privacidade + Termos de uso

**Obrigatório em ambas as stores.** Sem estes documentos a submissão é rejeitada.
- Hospedar numa página pública (ex: `hopon.pt/privacy`, `hopon.pt/terms`)
- Incluir: dados recolhidos, uso, retenção, RGPD, contacto

---

### 12.5 — Submeter na App Store (iOS)

**Tempo de review: 1 a 7 dias úteis** (às vezes mais rápido, raramente mais lento)

**Processo:**
1. Xcode → abrir projeto: `npx cap open ios`
2. Definir Bundle ID (ex: `pt.hopon.app`) e versão (ex: 1.0.0)
3. Product → Archive → Distribute App → App Store Connect
4. App Store Connect (`appstoreconnect.apple.com`) → My Apps → criar nova app
5. Preencher obrigatoriamente:
   - **Nome da app** (max 30 chars): "HopOn"
   - **Subtítulo** (max 30 chars): ex. "Carpooling para estudantes"
   - **Descrição** (max 4000 chars)
   - **Palavras-chave** (max 100 chars): "carpooling, boleia, partilha, viagem"
   - **Screenshots**: obrigatório 6.7" (iPhone 15 Pro Max) — pelo menos 3 imagens
   - **Categoria principal**: Travel
   - **URL da política de privacidade**: obrigatório
   - **Classificação etária**: preencher questionário (provavelmente 4+)
6. Submeter para review

**Causas comuns de rejeição pela Apple:**
- Sem Apple Sign-In (se tiver Google/Facebook login) — **Guideline 4.8**
- Política de privacidade em falta ou URL inválido
- App crashar durante o review
- Funcionalidade bloqueada (ex: precisar de conta de teste e não fornecer credenciais ao reviewer)
- UI com elementos quebrados ou texto placeholder
- Pagamentos fora do sistema Apple (para bens digitais) — **a HopOn é carpooling (serviço físico) por isso está isenta**
- Screenshots que não correspondem à app real

> ⚠️ Fornecer sempre conta de teste no campo "Notes for App Review" com email e password para o reviewer conseguir entrar.

**Atualizações futuras:**
- Cada atualização passa pelo mesmo processo de review
- Demora tipicamente menos (1-3 dias) para apps já aprovadas
- Bugs críticos podem ser corrigidos com "Expedited Review" (pedido especial, não garantido)

---

### 12.6 — Submeter no Google Play (Android)

**Tempo de review: horas a 3 dias** (primeira submissão pode demorar mais)

**Processo:**
1. Build: Android Studio → Build → Generate Signed Bundle/APK → Android App Bundle (.aab)
   - Criar keystore na primeira vez e **guardar em local seguro** — sem ela não podes atualizar a app
2. Google Play Console (`play.google.com/console`) → criar app
3. Preencher obrigatoriamente:
   - **Título**: "HopOn"
   - **Descrição curta** (max 80 chars)
   - **Descrição longa** (max 4000 chars)
   - **Screenshots**: mínimo 2 (telemóvel), recomendado 4-8
   - **Ícone**: 512×512px
   - **Feature graphic**: 1024×500px (banner)
   - **Categoria**: Travel & Local
   - **URL da política de privacidade**: obrigatório
   - **Classificação de conteúdo**: preencher questionário
4. Criar release:
   - **Internal testing** primeiro → partilhar com testers pelo email
   - Depois **Closed testing (Alpha)** → **Open testing (Beta)** → **Production**
   - Não ir direto para Production na primeira vez

**Causas comuns de rejeição pelo Google Play:**
- Política de privacidade em falta
- Permissões declaradas que a app não usa (ex: câmara sem justificação)
- App que crashar
- Metadados enganosos (screenshots que não correspondem à app)
- Conteúdo restrito sem aviso de classificação

> ⚠️ A keystore do Android é **irreversível** — se a perderes não podes publicar atualizações na mesma listagem. Guardar em 2+ locais seguros (ex: password manager + cloud encriptada).

**Atualizações futuras:**
- Reviews seguintes são mais rápidas (horas a 1 dia)
- O Google tem review automático + humano

---

### Processo de review — resumo comparativo

| | App Store (Apple) | Google Play (Android) |
|---|---|---|
| Tempo review inicial | 1–7 dias | Horas a 3 dias |
| Tempo reviews seguintes | 1–3 dias | Horas a 1 dia |
| Rigor | Alto — review manual | Médio — automático + humano |
| Rejeições mais comuns | Apple Sign-In, privacidade, crashes | Privacidade, permissões, metadados |
| Custo conta | $99/ano | $25 taxa única |
| Build obrigatório em Mac | Sim (Xcode) | Não (Android Studio no Windows) |

---

### Ordem recomendada

1. Implementar Fase 11 (Google + Apple Sign-In) — Apple exige se houver Google login
2. Criar Apple Developer Account ($99/ano)
3. Criar Google Play Developer Account ($25)
4. Preparar política de privacidade e termos de uso (hospedar online)
5. Preparar screenshots em todos os tamanhos
6. Build iOS num Mac → Internal TestFlight → submeter para App Store
7. Build Android → Internal testing no Play Console → submeter para Production
8. Aguardar aprovações (fazer em paralelo — não há dependência entre as duas)

---

## Fase 13 — Segurança (antes do lançamento público) ✅ CONCLUÍDA

> Análise feita em Março 2026. O estado geral é bom para beta, mas há 3 problemas a corrigir antes de abrir ao público.

| # | Item | Prioridade | Estado |
|---|---|---|---|
| 13.1 | Google Vision API key exposta no frontend | 🔴 Crítico | ✅ Movida para backend |
| 13.2 | Adicionar Helmet.js ao backend | 🟡 Importante | ✅ Concluído |
| 13.3 | Desativar Swagger em produção | 🟡 Importante | ✅ Concluído |

---

### O que já está bem (não tocar)

- ✅ **bcrypt** nas passwords — hashing seguro com salt
- ✅ **JWT + refresh tokens** — autenticação stateless com rotação de tokens
- ✅ **OTP** — verificação de email por código de uso único
- ✅ **Rate limiting** — 60 req/min global, 5/15min em auth, 3/15min em OTP
- ✅ **CORS** restrito ao domínio do frontend
- ✅ **ValidationPipe** com `whitelist + forbidNonWhitelisted` — rejeita campos desconhecidos
- ✅ **Prisma** — queries parametrizadas, imune a SQL injection
- ✅ **Stripe webhook** com verificação de assinatura (`whsec_`)
- ✅ **Sentry** para monitorização de erros em produção
- ✅ **ALLOW_TEST_VERIFY** protegido por env var — não funciona sem a flag ativa

---

### 13.1 — Google Vision API key exposta no frontend 🔴

**Problema:**
O ficheiro `src/config/google.ts` tem a key hardcoded:
```ts
export const GOOGLE_VISION_API_KEY = "***REMOVED-GOOGLE-API-KEY***";
```
Esta key fica visível no bundle JS compilado — qualquer pessoa pode ver no DevTools do browser e usar a quota do Google Cloud (que custa dinheiro).

**Pesquisar antes de implementar:**
- Google Cloud Console → APIs & Services → Credentials → editar a key → "Application restrictions" → HTTP referrers → adicionar `hopon.up.railway.app/*`
- Isto limita a key a só funcionar quando o pedido vem do domínio da app — mesmo que alguém copie a key, não consegue usar noutro sítio

**Solução alternativa (mais segura):**
- Mover a chamada à Google Vision API para o backend (NestJS)
- Frontend envia a imagem para `POST /api/v1/schedule/scan` → backend chama a Vision API com a key em env var
- Key nunca sai do servidor

**Recomendação:** fazer as duas coisas — restringir no Google Console agora (5 min) e mover para o backend quando houver tempo.

---

### 13.2 — Helmet.js no backend 🟡

**Problema:**
O backend não tem Helmet — faltam headers de segurança HTTP que os browsers esperam:
- `X-Frame-Options` — previne clickjacking (a app ser embutida num iframe malicioso)
- `X-Content-Type-Options` — previne MIME sniffing
- `Strict-Transport-Security` — força HTTPS
- `Content-Security-Policy` — controla de onde a app pode carregar recursos

**Implementação (5 minutos):**
```bash
cd backend && npm install helmet
```

Em `backend/src/main.ts`, adicionar antes do `app.enableCors()`:
```ts
import helmet from 'helmet';
app.use(helmet());
```

**Pesquisar antes de implementar:**
- Verificar se o Helmet conflitua com o Swagger UI (às vezes o CSP bloqueia os assets do Swagger)
- Se conflituar: `app.use(helmet({ contentSecurityPolicy: false }))` resolve

---

### 13.3 — Desativar Swagger em produção 🟡

**Problema:**
`/api/docs` está acessível publicamente em produção (`hopon-production-5bd2.up.railway.app/api/docs`), expondo toda a estrutura da API — endpoints, parâmetros, modelos de dados. Facilita ataques direcionados.

**Implementação:**
Em `backend/src/main.ts`, envolver o setup do Swagger com verificação de ambiente:
```ts
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()...
  SwaggerModule.setup('api/docs', app, document);
}
```

Ou proteger com password básica usando `express-basic-auth`:
```bash
npm install express-basic-auth
```
```ts
import basicAuth from 'express-basic-auth';
app.use('/api/docs', basicAuth({ users: { admin: process.env.SWAGGER_PASSWORD }, challenge: true }));
```

**Recomendação:** desativar em produção é mais simples e mais seguro. Swagger só é necessário em desenvolvimento local.

---

### Resumo — o que fazer e quando

| Quando | Ação |
|---|---|
| **Antes de lançar ao público** | Corrigir os 3 itens acima |
| **Agora (5 min)** | Restringir Google Vision key por domínio no Google Cloud Console |
| **Próxima sessão de código** | Helmet.js + desativar Swagger em produção |
| **Quando houver tempo** | Mover chamada Vision API para o backend |

---

## Nota futura — Migração do Prisma

> Para não esquecer quando o projeto escalar.

O Prisma é a escolha certa para o estado atual. Se o projeto atingir volume alto (milhões de queries/dia), considerar:
- Migrar queries complexas para `prisma.$queryRaw` (SQL direto, mais controlo)
- Ou migrar o ORM para **TypeORM** (mais maduro, mais configurável em escala)
- Apps muito grandes (Netflix, Uber) usam query builders como **Knex** ou SQL direto

Não é urgente — o Prisma escala bem até dezenas de milhares de utilizadores sem problemas.

---

## Fase 14 — Sistema de Verificação Completo

> Mínimo obrigatório para plataforma de ridesharing séria. Sem isto não é seguro lançar ao público.

### 14.1 — Backend: Carta de Condução + Validações

| # | Item | Estado |
|---|---|---|
| 14.1.1 | Adicionar campos ao schema Prisma: `driverLicenseUrl`, `driverLicenseStatus` (NONE/PENDING/APPROVED/REJECTED), `driverLicenseCcNumber`, `driverLicenseAdminNote` | ✅ Concluído |
| 14.1.2 | Migração manual da DB (local) | ✅ Concluído (`20260307000001_add_driver_license`) |
| 14.1.3 | Endpoint `POST /auth/me/driver-license?ccNumber=` — upload de imagem + campo `ccNumber` obrigatório | ✅ Concluído |
| 14.1.4 | Guard em `POST /vehicles` — bloquear se `driverLicenseStatus !== 'APPROVED'` | ✅ Concluído |
| 14.1.5 | Endpoints admin: `GET /admin/driver-licenses/pending`, `PATCH /admin/users/:id/driver-license/approve`, `PATCH /admin/users/:id/driver-license/reject` | ✅ Concluído |
| 14.1.6 | `buildUserResponse` inclui `verification.driverLicense` e `verification.identity` | ✅ Concluído |

### 14.2 — Backend: Verificação de Telemóvel

| # | Item | Estado |
|---|---|---|
| 14.2.1 | Infraestrutura OTP já existe (`/auth/otp/send` + `/auth/otp/verify`). Integrar envio SMS via Twilio ou SMS77 | ⬜ Por fazer |
| 14.2.2 | Rate limiting no envio de OTP por SMS (já existe para email) | ⬜ Por fazer |

### 14.3 — Frontend: UI de Verificação

| # | Item | Estado |
|---|---|---|
| 14.3.1 | Secção "Verificação" unificada no ProfilePage — estado visual de carta de condução + identidade | ✅ Concluído |
| 14.3.2 | `DriverLicenseSheet.tsx` — upload com campo nº CC obrigatório + explicação + estado (NONE/PENDING/APPROVED/REJECTED) | ✅ Concluído |
| 14.3.3 | Guard no backend em `POST /vehicles` bloqueia sem carta aprovada (erro 403 com mensagem clara) | ✅ Concluído |
| 14.3.4 | Admin Panel — nova aba "Cartas" com lightbox, nº CC declarado, aprovar/rejeitar com nota | ✅ Concluído |
| 14.3.5 | Tipos `UserVerification` e `User` atualizados no frontend | ✅ Concluído |
| 14.3.6 | Badge de verificação no perfil público (condutor verificado) | ⬜ Por fazer |

### Migração Railway (produção)

Após fazer deploy, correr no Railway Dashboard → PostgreSQL → Query:
```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "driverLicenseUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "driverLicenseStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "driverLicenseCcNumber" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "driverLicenseAdminNote" TEXT;
```

### Lógica de verificação resumida

| Requisito | Obrigatório para |
|---|---|
| Email verificado | Qualquer ação na plataforma |
| Telemóvel verificado | Fazer booking como passageiro |
| Carta de condução aprovada (com nº CC) | Adicionar veículo + oferecer boleia |

### Porquê o nº CC na carta?
O nº do Cartão de Cidadão deve aparecer na foto da carta de condução para cruzar identidades — impede que alguém use a carta de outra pessoa. Admin valida manualmente a correspondência.
