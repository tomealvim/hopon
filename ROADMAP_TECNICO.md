# HopOn — Roadmap Técnico

> Documento vivo. Atualizar à medida que os itens são concluídos.

---

## Conceito do produto

**HopOn é uma plataforma de carpooling diário de partilha de custos — o substituto real dos transportes públicos.**

O objetivo não é ser uma BlaBlaCar (viagens longas ocasionais). O objetivo é substituir o autocarro, o metro e o carro individual em trajetos recorrentes de trabalho e universidade — viagens curtas a médias, feitas todos os dias, com pessoas que partilham rotas semelhantes.

**O que somos:**
- Carpooling diário: Lisboa → trabalho, casa → faculdade, subúrbio → centro
- Trajetos recorrentes e horários fixos — não viagens espontâneas
- Público: trabalhadores, estudantes universitários, qualquer pessoa com rotina de deslocação
- Modelo de custo-partilha: condutor divide gasolina + portagens, não lucra

**O que não somos:**
- Uber/Bolt (taxi on-demand com motoristas profissionais)
- BlaBlaCar (viagens longas, esporádicas, intercidades)
- Transporte escolar ou charter

**O diferencial técnico:**
O sistema tem de ser tão fiável quanto um autocarro — o passageiro tem de poder confiar que o condutor aparece. Isto significa matching inteligente por rota + horário, política de cancelamento rigorosa, e comunicação direta entre condutor e passageiro.

**Referências de mercado:**
- **BlaBlaDaily** (BlaBlaCar tentou, recuou em vários mercados — espaço em aberto)
- **Karos** (França, commute carpooling — modelo mais próximo)
- **Waze Carpool** (Google, EUA — integrado com navegação)
- **Scoop** (EUA, workplace carpooling)

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

> **Importante:** o telemóvel verificado é obrigatório para fazer booking como passageiro.
> Razão: condutor e passageiro precisam de se contactar diretamente (atrasos, local de encontro, etc.).
> A infraestrutura OTP já existe — falta apenas ligar a um provider de SMS.

| # | Item | Estado |
|---|---|---|
| 14.2.1 | Integrar envio SMS via **Twilio** (ou alternativa mais barata quando houver volume) — substituir o `logger.log` atual no `sendOtp` para `channel=phone` pelo envio real de SMS | 📋 A discutir — pago, adiar até ter beta users; telemóvel obrigatório para reservar? |
| 14.2.2 | Rate limiting no envio de OTP por SMS (já existe para email — reutilizar) | 📋 A discutir — depende de 14.2.1 |
| 14.2.3 | Guard em `POST /bookings` — bloquear se `phoneVerifiedAt` for null (com mensagem clara a pedir verificação) | 📋 A discutir — bloquear passageiros sem telemóvel verificado é agressivo no início |

### 14.3 — Frontend: UI de Verificação

| # | Item | Estado |
|---|---|---|
| 14.3.1 | Secção "Verificação" unificada no ProfilePage — estado visual de carta de condução + identidade | ✅ Concluído |
| 14.3.2 | `DriverLicenseSheet.tsx` — upload com campo nº CC obrigatório + explicação + estado (NONE/PENDING/APPROVED/REJECTED) | ✅ Concluído |
| 14.3.3 | Guard no backend em `POST /vehicles` bloqueia sem carta aprovada (erro 403 com mensagem clara) | ✅ Concluído |
| 14.3.4 | Admin Panel — nova aba "Cartas" com lightbox, nº CC declarado, aprovar/rejeitar com nota | ✅ Concluído |
| 14.3.5 | Tipos `UserVerification` e `User` atualizados no frontend | ✅ Concluído |
| 14.3.6 | Badge de verificação no perfil público (condutor verificado) | 📋 A discutir — definir quais badges mostrar (carta aprovada? identidade? ambos?) |

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

---

## Fase 15 — Experiência de Commute Diário

> Peças essenciais que têm de existir para que o matching da Fase 16 resulte em experiências reais de commute — sem estas, mesmo o melhor matching parte na execução.

### 15.0 — Contacto entre condutor e passageiro

| # | Item | Estado |
|---|---|---|
| 15.0.1 | Após reserva CONFIRMED, mostrar telemóvel do condutor ao passageiro (e vice-versa) nas sheets de detalhe | ✅ Concluído |
| 15.0.2 | Link `tel:` clicável para ligar diretamente | ✅ Concluído |
| 15.0.3 | Só mostrar após CONFIRMED — nunca antes (privacidade) | ✅ Concluído |

### 15.1 — "A caminho" — alerta de chegada ao passageiro

| # | Item | Estado |
|---|---|---|
| 15.1.1 | Endpoint `POST /rides/:id/on-the-way` — driver anuncia que está a caminho | ✅ Concluído |
| 15.1.2 | Push notification + in-app para passageiros confirmados: "João está a caminho — parte em ~X min" | ✅ Concluído |
| 15.1.3 | Botão "Estou a caminho" no card do driver (visível só quando boleia parte em ≤2h e status SCHEDULED) | ✅ Concluído |
| 15.1.4 | Guardar `onTheWayAt` no modelo Ride para evitar spam (só permite 1x por boleia) | ✅ Concluído |

### 15.2 — Reservas recorrentes pelo passageiro ✅ CONCLUÍDA

| # | Item | Estado |
|---|---|---|
| 15.2.1 | Passageiro pode "subscrever" um ScheduleTemplate de condutor — reserva automática cada vez que é criada uma boleia desse template | ✅ Concluído |
| 15.2.2 | Modelo `RecurringBooking` — (passengerId, scheduleId, estado ACTIVE/PAUSED/CANCELLED) | ✅ Concluído |
| 15.2.3 | Cron de geração de boleias verifica RecurringBookings ativos e cria reserva automática | ✅ Concluído |
| 15.2.4 | UI: botão "Reservar sempre" no card "Para Ti" no Discover (toggle ativa/cancela) | ✅ Concluído |

### 15.3 — Ponto de encontro específico ✅ CONCLUÍDA

| # | Item | Estado |
|---|---|---|
| 15.3.1 | Campo `meetingPoint` (texto livre) no modelo `Ride` | ✅ Concluído |
| 15.3.2 | Condutor define ponto de encontro ao publicar boleia | ✅ Concluído — campo já existia no form, agora é enviado e guardado |
| 15.3.3 | Mostrar ponto de encontro na `RequestSeatSheet` antes de reservar | ✅ Concluído |

### 15.4 — Impacto ambiental e poupança ✅ CONCLUÍDA

| # | Item | Estado |
|---|---|---|
| 15.4.1 | Calcular CO₂ poupado: `distanceKm × 0.12 kg/km` por boleia como passageiro | ✅ Concluído |
| 15.4.2 | Calcular poupança em €: custo carro próprio (€0.25/km) - custo pago na boleia | ✅ Concluído |
| 15.4.3 | `ImpactWidget` no ProfilePage — CO₂ poupado, € poupados, viagens como passageiro, passageiros transportados | ✅ Concluído |

---

## Fase 15b — Fiabilidade (Commute First)

> Para substituir transportes públicos, a plataforma tem de ser tão fiável quanto um autocarro. Cancelar a 20 minutos é inaceitável — a pessoa fica sem ir trabalhar.

### 15b.1 — Política de cancelamento mais rigorosa

A política atual (>24h=100%, 2–24h=50%, <2h=0%) foi desenhada para viagens longas ocasionais. Para commutes diários precisa de ser muito mais apertada.

| # | Item | Estado |
|---|---|---|
| 15.1.1 | Novos thresholds: >2h=100%, 30min–2h=50%, <30min=0% | ✅ Concluído |
| 15.1.2 | Aplicar à UI existente (RidesPage + RequestSeatSheet) | ✅ Concluído |
| 15.1.3 | Backend: atualizar lógica de reembolso em `bookings.service.ts` | ✅ Concluído |

### 15b.2 — Taxa de fiabilidade no perfil

| # | Item | Estado |
|---|---|---|
| 15.2.1 | Calcular % de viagens não canceladas nos últimos 30 dias por utilizador | ✅ Concluído |
| 15.2.2 | Mostrar no perfil público: "98% de fiabilidade · 47 viagens" | ✅ Concluído |
| 15.2.3 | Badge "Condutor fiável" (≥95% nos últimos 30 dias, mínimo 10 viagens) | ✅ Concluído |

### 15b.3 — Penalização por cancelamentos repetidos

| # | Item | Estado |
|---|---|---|
| 15.3.1 | Contar cancelamentos de última hora (<2h) por utilizador nos últimos 30 dias — rolling window via `lateCancelCount` + `lateCancelWindowStart` | ✅ Concluído |
| 15.3.2 | Ao 3.º cancelamento: suspensão automática (`suspendedAt`) — impedido de criar boleias | ✅ Concluído |
| 15.3.3 | Ao 5.º: notificação in-app + email (low priority) | 📋 A discutir — vale a pena? suspenso ao 3.º, o 5.º já não usa a plataforma |

### 15b.4 — Reserva instantânea (auto-accept) ✅ CONCLUÍDA

> O fluxo atual de "condutor aceita manualmente" é bom para desconhecidos ocasionais mas péssimo para commute diário — adiciona fricção e latência.

| # | Item | Estado |
|---|---|---|
| 15.4.1 | Campo `instantBooking boolean` no modelo `Ride` | ✅ Concluído |
| 15.4.2 | Toggle na UI do condutor ao publicar boleia: "Reserva instantânea" (on por defeito) | ✅ Concluído |
| 15.4.3 | Se `instantBooking=true` e passageiro na rota (≤500m): booking auto-CONFIRMED | ✅ Concluído |
| 15.4.4 | Badge "Instantânea" no card de boleia no Discover | ✅ Concluído |

---

## Fase 16 — Smart Matching (Daily Hardcore)

> O objetivo é que o utilizador abra a app e veja imediatamente "João passa a 500m de ti às 8h15 amanhã, mesmo destino". Sem pesquisar. Sem fricção. Como um autocarro inteligente.

### 16.1 — Route corridor matching + desvio inteligente

> O matching atual é ponto-a-ponto (origem → destino). Para commutes, o que interessa é sobreposição de rota — se vou de Benfica para o Marquês, posso apanhar alguém em Campo de Ourique.
> Além disso, a lógica "na rota vs fora da rota" determina se uma reserva pode ser auto-confirmada ou precisa de aceite manual do condutor com informação do desvio.

#### 16.1a — Polilinha e sobreposição

| # | Item | Estado |
|---|---|---|
| 16.1.1 | Guardar polilinha da rota no `Ride` (JSON de coordenadas lat/lng) via Google Directions API — calculada uma vez na criação, cacheada em Redis | ✅ Concluído |
| 16.1.2 | Algoritmo ponto-a-segmento: calcular distância mínima de um ponto (pickup/dropoff do passageiro) a cada segmento da polilinha do condutor — sem chamada de API externa | ✅ Concluído |
| 16.1.3 | Threshold configurável: ≤500m = "na rota", 500m–2km = "pequeno desvio", >2km = "fora da rota" | ✅ Concluído |
| 16.1.4 | Score de sobreposição em % — mostrar "Rota 87% compatível" no card do Discover | ✅ Concluído — badge `overlapPct% compatível` no RideCard da tab "Para Ti" |
| 16.1.5 | Atualizar `GET /rides/for-you` para usar sobreposição de corredor em vez de só Haversine ponto-a-ponto | ✅ Concluído — `findForUser` já usa `calcOverlapPct()` + corredor 2km |

#### 16.1b — Desvio inteligente no booking

> A lógica "na rota vs fora da rota" determina o fluxo de reserva:
> - **Na rota** (≤500m) + `instantBooking=true` → auto-CONFIRMED sem intervenção do condutor
> - **Pequeno desvio** (500m–2km) → notificação ao condutor com info do desvio: "Ana pede lugar — ponto de encontro fica 850m fora da tua rota, desvio ~4 min. Aceitar?"
> - **Fora da rota** (>2km) → condutor aceita/recusa; passageiro vê aviso "boleia requer desvio"

| # | Item | Estado |
|---|---|---|
| 16.1b.1 | No `POST /bookings`, calcular distância do pickup do passageiro à polilinha do condutor | ✅ Concluído |
| 16.1b.2 | Incluir `detourMeters` na notificação de pedido ao condutor: "na rota" / "Xm desvio" / "Xkm fora" | ✅ Concluído |
| 16.1b.3 | Badge verde/âmbar/vermelho no card de reserva pendente do condutor (RidesPage) | ✅ Concluído |
| 16.1b.4 | Se na rota + `instantBooking=true` → auto-CONFIRMED sem aceite manual | ✅ Concluído |

#### 16.1c — Script de matching contínuo (background dispatcher)

> Cron que corre em background cruzando UserRoutes dos passageiros com ScheduleTemplates dos condutores. Notifica ambos proativamente quando há sobreposição — sem o utilizador pesquisar nada.

| # | Item | Estado |
|---|---|---|
| 16.1c.1 | Cron (7h e 17h diário) — cruzar todos os UserRoutes ativos com todos os ScheduleTemplates ativos: sobreposição de dias + hora ±45min + corredor 1500m | ✅ Concluído |
| 16.1c.2 | Deduplicação obrigatória via Redis: chave `match:{passengerId}:{driverId}:{scheduleId}` com TTL 24h — nunca notificar o mesmo par mais do que 1x/dia | ✅ Concluído |
| 16.1c.3 | In-app ao passageiro: "João passa perto de ti X-feira às 8h15 no trajeto A → B. Queres pedir lugar?" | ✅ Concluído |
| 16.1c.4 | Push + in-app ao condutor (quando há passageiro com rota compatível sem boleia) | ⬜ Por fazer (baixa prioridade) |
| 16.1c.5 | `POST /scheduler/trigger-matching` — trigger manual para testes | ✅ Concluído |

### 16.2 — "Disponível agora" — modo instantâneo

> Para quando alguém sai agora e quer apanhar alguém no caminho, ou quando o passageiro precisa de uma boleia em 20 minutos.

| # | Item | Estado |
|---|---|---|
| 16.2.1 | Condutor pode publicar boleia "agora" com departurTime = now + X min | ✅ Concluído — form já aceita qualquer hora; o campo de hora no form é livre |
| 16.2.2 | Feed "Disponível agora" no Discover — boleias que partem nas próximas 2h | ✅ Concluído — tab "Agora" no Discover, endpoint `GET /rides/available-now`, countdown em minutos |
| 16.2.3 | Push notification proativa: "Pedro está a 3km de ti e vai para o teu destino em 15 min" | ⬜ Por fazer (requer geolocalização em tempo real — complexo, baixa prioridade) |

### 16.3 — Arranjos recorrentes (driver ↔ passenger committed)

> O nível máximo de fiabilidade: condutor e passageiro comprometem-se mutuamente para uma série de dias. Como ter o teu próprio boleia privado de segunda a sexta.

| # | Item | Estado |
|---|---|---|
| 16.3.1 | Modelo `RecurringArrangement` — par (driverId, passengerId), scheduleTemplateId, estado (PENDING/ACTIVE/DECLINED/ENDED) | ✅ Concluído |
| 16.3.2 | Interface para propor arranjo após viagem concluída — botão "Propor arranjo recorrente" no HistorySheet do condutor | ✅ Concluído |
| 16.3.3 | Criação automática de reservas via `RecurringBooking` quando passageiro aceita | ✅ Concluído — aceitar cria/reativa RecurringBooking no template |
| 16.3.4 | Cancelamento de arranjo — `DELETE /recurring-arrangements/:id` cancela RecurringBooking + notifica o outro participante | ✅ Concluído |
| 16.3.5 | Proposta pendente visível ao passageiro na tab "Agora" do Discover — aceitar/recusar inline | ✅ Concluído |

### 16.4 — Match requests (passageiro publica necessidade)

> Inverter o fluxo: em vez de só condutores publicarem boleias, passageiros publicam "Preciso de boleia Mon-Sex 8h, Almada → Setúbal". Sistema notifica condutores com rota compatível.

| # | Item | Estado |
|---|---|---|
| 16.4.1 | Modelo `RideRequest` — passageiro define rota, horário, dias, estado (OPEN/MATCHED/CLOSED) | ✅ Concluído |
| 16.4.2 | `POST /ride-requests` + `GET /ride-requests` + `DELETE /ride-requests/:id` | ✅ Concluído |
| 16.4.3 | Cron diário: cruzar RideRequests abertas com novos ScheduleTemplates de condutores | ✅ Concluído — `matchRideRequestsWithTemplates()` em scheduler.service.ts |
| 16.4.4 | Push notification ao condutor: "Ana precisa de boleia na tua rota Mon-Sex às 8h" | ✅ Concluído |
| 16.4.5 | Feed de "Pedidos de boleia na minha rota" para condutores na aba Rides | 📋 A discutir — os condutores recebem push/in-app; feed separado tem valor? |

### 16.5 — Smart home feed

> O Discover atual é uma lista de boleias que o user tem de pesquisar. O objetivo é que seja proativo — a app sabe a rotina do user e sugere sem pesquisar.

| # | Item | Estado |
|---|---|---|
| 16.5.1 | Feed personalizado baseado em UserRoutes + horário habitual — aparece ao abrir a app | ✅ Concluído — tab "Para Ti" carrega `GET /rides/for-you` ao montar |
| 16.5.2 | Secção "Para amanhã" — boleias que batem com a rota do user no dia seguinte | ✅ Concluído — secção "Para amanhã" com emoji 🌅 |
| 16.5.3 | Secção "Habituais" — condutores com quem o user já viajou e têm boleia disponível | ✅ Concluído — secção "Condutores habituais" com emoji 🤝 |
| 16.5.4 | Ordenação por score composto: sobreposição de rota + fiabilidade do condutor + reviews + distância ao passageiro | ✅ Concluído — `matchScore` calculado em `findForUser` (tempo 30pts + overlap 70pts + familiar 20pts) |

### 16.6 — Comunidades (empresa / faculdade) 📋 A DISCUTIR

> Grupos fechados onde só entra quem tem email do domínio ou convite. Aumenta confiança porque condutor e passageiro são colegas.
> **Discussão pendente:** confiança já está coberta por verificação de identidade + carta + ratings. Comunidades adicionam fricção de onboarding e complexidade de moderação. Implementar o resto da Fase 16 primeiro e reavaliar.

| # | Item | Estado |
|---|---|---|
| 16.6.1 | Modelo `Community` — nome, domínio de email (ex: `@iscte.pt`), tipo (UNIVERSITY/WORKPLACE/OPEN) | 📋 A discutir |
| 16.6.2 | Auto-join por domínio de email na verificação (quem tem email `@iscte.pt` entra na comunidade ISCTE) | 📋 A discutir |
| 16.6.3 | Filtro "Só da minha comunidade" no Discover | 📋 A discutir |
| 16.6.4 | Condutor pode publicar boleia só para a comunidade | 📋 A discutir |

### Prioridade de implementação da Fase 16

```
1. 15.1 + 15.4 (cancelamento rigoroso + reserva instantânea) — base de fiabilidade
2. 16.1 (route corridor matching) — diferencial técnico principal
3. 16.5 (smart home feed) — experiência diária
4. 16.4 (ride requests) — inverter o fluxo
5. 16.2 (disponível agora) — modo instantâneo
6. 16.3 (arranjos recorrentes) — relações de longo prazo
7. 16.6 (comunidades) — crescimento orgânico
```
