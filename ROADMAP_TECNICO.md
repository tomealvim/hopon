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

## Problemas identificados (por ordem de gravidade)

### 🔴 CRÍTICO — Dual data source (mock + API convivem)

O `RidesContext` é um sistema de estado local (mock) que ainda coexiste com o backend real.
O resultado: a página Discover mostra boleias da API **e** boleias mock ao mesmo tempo.
"Para Ti", "As minhas ofertas" e "Os meus pedidos" em RidesPage usam **apenas** o mock.

**Isto tem de ser resolvido antes de qualquer feature nova.** O mock tem de ser eliminado e tudo
tem de passar pelo backend.

### 🔴 CRÍTICO — "Para Ti" não usa ScheduleTemplates

A feature mais importante do produto — matching baseado no horário do utilizador — está implementada
com mock data local. Não cruza os `ScheduleTemplate` reais do utilizador com as boleias disponíveis
na API. O tab "Para Ti" é atualmente decorativo.

### 🟠 IMPORTANTE — Fluxo de pagamento incompleto

O wallet existe e permite top-up, mas não há nenhum fluxo que debite/credite carteiras quando
uma reserva é criada ou concluída. O pagamento entre passageiro e condutor não acontece de facto.

### 🟠 IMPORTANTE — Preço é arbitrário

O condutor define `price` manualmente. Para um app de partilha de custos, o preço devia ser
**calculado/sugerido** com base em distância × custo/km ÷ nº de lugares. Não há calculadora.

### 🟡 MENOR — Driver não consegue aceitar/recusar reservas reais

`acceptRequest`/`declineRequest` em RidesPage usam o mock context, não a API de bookings.
O backend tem status PENDING/ACCEPTED mas o driver não tem UI para gerir reservas reais.

### 🟡 MENOR — `campus` já não faz sentido

O campo `campus` em `Location` e referências a "contexto universitário" são resquícios da versão
estudante. Não quebra nada mas deve ser limpo gradualmente.

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

Resolver o problema mais crítico: `RidesContext` mock vs API real.

**Passos:**
- [ ] Eliminar `RidesContext` (ou convertê-lo em wrapper da API)
- [ ] `RidesPage` — "As minhas ofertas" e "Os meus pedidos" via `GET /rides/mine` e `GET /bookings/mine`
- [ ] `RidesPage` — calendário via rides reais da API
- [ ] Gestão de bookings pelo driver: aceitar/recusar via `PATCH /bookings/:id/status`
- [ ] `DiscoverPage` — eliminar secção de mock offers/requests (manter só API rides)
- [ ] Eliminar tabs "requests" e mock "for-you" até terem backend

**Ficheiros a tocar:**
- `src/contexts/RidesContext.tsx` (eliminar ou reescrever como API wrapper)
- `src/pages/RidesPage.tsx`
- `src/pages/DiscoverPage.tsx`
- `backend/src/modules/rides/rides.service.ts` (adicionar `findMine`)
- `backend/src/modules/bookings/bookings.controller.ts` (rota PATCH status)

---

### 2.5 — "Para Ti" com ScheduleTemplates ✅ CONCLUÍDA

O algoritmo de matching que define o produto.

**Lógica:**
1. Utilizador tem N `ScheduleTemplate` ativos (ex: "Porto → Lisboa, Seg/Qua/Sex, 08:00")
2. Backend cruza templates com rides disponíveis: mesmos dias da semana, hora próxima (±30min),
   origem/destino próximos (Haversine, ex: raio 5km)
3. Resultado: lista ordenada por relevância → "Para Ti"

**Passos:**
- [ ] `GET /rides/for-you` no backend — cruza ScheduleTemplates do user com rides disponíveis
- [ ] Query: `daysOfWeek` overlap + `departureTime` hora ±30min + Haversine origem/destino
- [ ] Frontend: tab "Para Ti" consome `GET /rides/for-you` (API real)
- [ ] UI: badge "Match perfeito" quando todos os critérios batem, "Match parcial" se só alguns

**Ficheiros a tocar:**
- `backend/src/modules/rides/rides.service.ts`
- `backend/src/modules/rides/rides.controller.ts`
- `src/pages/DiscoverPage.tsx`

---

### 2.6 — Calculadora de custo por viagem ✅ CONCLUÍDA

Para o modelo de partilha de custos funcionar, o preço tem de ser transparente e justo.

**Passos:**
- [ ] Quando condutor cria boleia com LocationInput (com coordenadas), calcular distância via
  Mapbox Directions API (ou fórmula Haversine como aproximação rápida)
- [ ] Sugerir preço: `(distância_km × 0.06€) ÷ nº_lugares` (custo médio gasolina em PT)
- [ ] Campo "Portagens" manual (sim/não + valor estimado) — somar ao custo total
- [ ] Condutor pode ajustar o preço sugerido mas o sistema mostra sempre "custo estimado real"
- [ ] No card da boleia no Discover: mostrar preço/lugar de forma clara

**Ficheiros a tocar:**
- `src/components/ui/OfferRideForm.tsx`
- `backend/src/modules/rides/dto/create-ride.dto.ts`
- Novo utilitário `src/utils/cost-calculator.ts`

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
- [x] Observabilidade: pino structured logging + Sentry (SENTRY_DSN)
- [x] Rate limiting por IP — global 60/min, auth 5/15min, OTP 3/15min
- [x] CI/CD GitHub Actions — backend build+test + frontend build em cada push

---

## Ordem de implementação recomendada

```
2.4  Eliminar mock / ligar RidesPage à API     ← resolve dívida técnica crítica
2.5  "Para Ti" com ScheduleTemplates            ← core do produto, diferencial
2.6  Calculadora de custo                       ← essencial para o modelo de negócio
2.7  Fluxo de pagamento real                    ← wallet útil de facto
2.8  Trust & Safety                             ← antes de crescer utilizadores
3.x  Scale                                      ← quando tiveres problemas de scale
```
