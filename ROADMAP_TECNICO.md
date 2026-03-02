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
| Wallet | Backend ledger + UI | Funcional (sem fluxo de pagamento real) |
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
| 5.1 | Fluxo de avaliação pós-viagem | ✅ GET /ratings/pending + SSE ride.completed + botões "Avaliar" em RidesPage |
| 5.2 | Templates de email HTML | ✅ Layout HTML com branding HopOn, estilos inline, 6 templates |
| 5.3 | Auto-geração de boleias por template (cron) | ✅ @nestjs/schedule cron diário às 06:00, POST /scheduler/trigger para teste |
| 5.4 | Invalidação de cache nas mutações | ✅ cache.clear() após create/remove/complete em rides.service |
| 5.5 | Filtros avançados na Discover | ✅ Data, hora, preço máx, lugares, verificados — chips de filtros ativos |

---

## Fase 6 — Deploy & Testes E2E

| # | Item | Estado |
|---|---|---|
| 6.1 | Deploy Railway (backend) + Vercel (frontend) | ✅ Railway + Vercel configurados, CI/CD automático via push para main |
| 6.2 | Testes E2E contra produção | ✅ Suite completa 6/6 passou contra Railway; DB verify 19/19 |
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
