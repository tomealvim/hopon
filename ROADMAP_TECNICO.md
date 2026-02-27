# HopOn — Roadmap Técnico

> Documento vivo. Atualizar à medida que os itens são concluídos.

---

## Estado atual da stack

| Componente | Tecnologia | Estado |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind 4 | Sólido |
| Backend | NestJS 10 + TypeScript | Sólido |
| ORM | Prisma | Sólido |
| Base de dados | SQLite | **Problema — trocar já** |
| Inbox | localStorage (client-side only) | **Problema — reescrever** |
| Concorrência em bookings | Sem transações | **Bug potencial — corrigir já** |
| Ratings | Não existe | Core feature em falta |
| Realtime | Não existe | Fase 2 |
| Geodata | Origem/destino em texto | Fase 2 |

---

## Fase 1 — Fundações (fazer antes de qualquer feature nova)

### 1.1 — Migrar SQLite para PostgreSQL

**Porquê agora:** SQLite é single-writer, sem concorrência real, sem índices avançados, sem geosearch. Tudo o que vem a seguir depende disto.

**Passos:**
- [ ] Provisionar instância PostgreSQL (local com Docker ou serviço cloud — Supabase, Railway, Neon)
- [ ] Atualizar `backend/.env`: `DATABASE_URL=postgresql://...`
- [ ] Atualizar `backend/prisma/schema.prisma`: mudar `provider = "sqlite"` para `provider = "postgresql"`
- [ ] Rever tipos do schema que são incompatíveis (ex: `Json` fields, `DateTime` defaults)
- [ ] Correr `npx prisma migrate dev --name migrate-to-postgres`
- [ ] Testar todos os endpoints principais (auth, rides, bookings, schedules, vehicles)
- [ ] Atualizar `COMO_LIGAR.md` com instruções para correr Postgres localmente

**Ficheiros a tocar:**
- `backend/prisma/schema.prisma`
- `backend/.env`
- `backend/.env.example` (se existir)

---

### 1.2 — Transações em Bookings (concorrência)

**Porquê agora:** Sem transações, dois utilizadores podem reservar o último lugar ao mesmo tempo. Com SQLite mascarado, com PostgreSQL em produção este bug aparece.

**Passos:**
- [ ] Envolver a lógica de criação de booking numa `prisma.$transaction()`
- [ ] Dentro da transação: verificar `availableSeats` com `SELECT FOR UPDATE` (via `findUnique` + update atómico)
- [ ] Lançar `ConflictException` se não houver lugares disponíveis
- [ ] Fazer o mesmo para cancelamento (incrementar `availableSeats` dentro de transação)
- [ ] Adicionar testes manuais (ou automatizados) para o cenário de race condition

**Ficheiros a tocar:**
- `backend/src/modules/bookings/bookings.service.ts`

**Padrão a implementar:**
```typescript
await prisma.$transaction(async (tx) => {
  const ride = await tx.ride.findUnique({
    where: { id: rideId },
    select: { availableSeats: true, status: true },
  });
  if (!ride || ride.availableSeats < seatsRequested) {
    throw new ConflictException('Não há lugares suficientes.');
  }
  await tx.ride.update({
    where: { id: rideId },
    data: { availableSeats: { decrement: seatsRequested } },
  });
  return tx.booking.create({ data: { ... } });
});
```

---

### 1.3 — Inbox no Backend

**Porquê agora:** Inbox em localStorage não sincroniza entre dispositivos, não tem histórico persistente, não tem unread counts fiáveis. Não é um produto — é uma demo.

**Novos modelos Prisma:**
```prisma
model Conversation {
  id           String    @id @default(uuid())
  rideId       String?
  bookingId    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  ride         Ride?     @relation(fields: [rideId], references: [id])
  booking      Booking?  @relation(fields: [bookingId], references: [id])
  participants ConversationParticipant[]
  messages     Message[]
}

model ConversationParticipant {
  id             String       @id @default(uuid())
  conversationId String
  userId         String
  lastReadAt     DateTime?
  joinedAt       DateTime     @default(now())

  conversation   Conversation @relation(fields: [conversationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])

  @@unique([conversationId, userId])
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  senderId       String
  body           String
  createdAt      DateTime     @default(now())
  editedAt       DateTime?
  deletedAt      DateTime?

  conversation   Conversation @relation(fields: [conversationId], references: [id])
  sender         User         @relation(fields: [senderId], references: [id])
}
```

**Passos:**
- [ ] Adicionar modelos ao `schema.prisma` e migrar
- [ ] Criar `InboxModule` no backend (controller, service, DTOs)
- [ ] Endpoints: `GET /inbox`, `GET /inbox/:conversationId/messages`, `POST /inbox/:conversationId/messages`
- [ ] Criar conversa automaticamente quando um booking é aceite
- [ ] Migrar frontend `InboxContext` para consumir API em vez de localStorage
- [ ] Remover lógica de localStorage do frontend

**Ficheiros a tocar:**
- `backend/prisma/schema.prisma`
- `backend/src/modules/` (novo módulo inbox)
- `backend/src/app.module.ts`
- `src/contexts/InboxContext.tsx`
- `src/services/api.ts`

---

### 1.4 — Ratings e Reviews

**Porquê agora:** Em ridesharing, confiança é o produto. Sem ratings não há razão para um utilizador confiar em desconhecidos.

**Novo modelo Prisma:**
```prisma
model Rating {
  id          String   @id @default(uuid())
  bookingId   String   @unique
  reviewerId  String
  revieweeId  String
  score       Int      // 1-5
  tags        String?  // JSON array: ["pontual", "simpático", "condução segura"]
  comment     String?
  createdAt   DateTime @default(now())

  booking     Booking  @relation(fields: [bookingId], references: [id])
  reviewer    User     @relation("ReviewsGiven", fields: [reviewerId], references: [id])
  reviewee    User     @relation("ReviewsReceived", fields: [revieweeId], references: [id])
}
```

**Passos:**
- [ ] Adicionar modelo ao `schema.prisma` e migrar
- [ ] Criar `RatingsModule` no backend
- [ ] Endpoints: `POST /ratings` (criar após booking completo), `GET /users/:id/ratings`
- [ ] Calcular `averageScore` no perfil (pode ser campo calculado ou cached no `Profile`)
- [ ] UI: rating prompt após viagem concluída
- [ ] UI: mostrar score médio no perfil e nos cards de driver

---

## Fase 2 — Produto Sério

### 2.1 — Geodata estruturada

Substituir `origin`/`destination` em texto por modelo estruturado com coordenadas.

```prisma
model Location {
  id        String  @id @default(uuid())
  label     String  // texto visível
  lat       Float
  lng       Float
  placeId   String? // Google Places ID
  city      String?
  campus    String? // para contexto universitário
}
```

- [x] Adicionar modelo `Location` ao schema (label, lat?, lng?, placeId?, city?, campus?)
- [x] Adicionar `originLocationId`/`destinationLocationId` opcionais à `Ride` (FK → Location)
- [x] Backend cria registos `Location` quando lat/lng são fornecidos no CreateRideDto
- [x] Pesquisa por proximidade com Haversine em SQL (lat/lng/radius no SearchRidesDto)
- [x] Componente `LocationInput` com autocomplete **Mapbox Geocoding API** + fallback texto
- [x] `VITE_MAPBOX_TOKEN` em `.env` do frontend

> **⚠️ Nota — Mapbox vs Google Places**
>
> Implementámos com **Mapbox** (50k pedidos/mês grátis, sem cartão obrigatório).
> Se escalar ou precisar de melhor cobertura de POIs portugueses, considerar migrar para
> **Google Places API** ($200 crédito/mês, mas exige cartão de crédito).
> A migração é simples: substituir `fetchSuggestions()` em `LocationInput.tsx` —
> o resto do componente (`LocationValue`, `onLocationSelect`) mantém-se igual.
> Avaliar quando `VITE_MAPBOX_TOKEN` atingir o limite gratuito.

---

### 2.2 — Realtime (Mensagens e Notificações)

**Opção recomendada para esta fase: Server-Sent Events (SSE)**
- Simples de implementar no NestJS
- Suficiente para notificações push servidor → cliente
- Migrar para WebSockets só se precisarmos de comunicação bidirecional com baixa latência

**Passos:**
- [ ] Implementar SSE endpoint no NestJS (`/events/stream`)
- [ ] Emitir eventos para: nova mensagem, booking aceite/recusado, nova solicitação de booking
- [ ] Conectar frontend via `EventSource`
- [ ] Fallback: polling simples a cada 30s para browsers que não suportam SSE

---

### 2.3 — Ledger de Pagamentos

Separar balance de histórico de transações.

```prisma
model WalletTransaction {
  id          String   @id @default(uuid())
  walletId    String
  type        String   // CREDIT | DEBIT | REFUND | PAYOUT
  amount      Float
  reference   String?  // bookingId, etc.
  description String?
  createdAt   DateTime @default(now())

  wallet      Wallet   @relation(fields: [walletId], references: [id])
}
```

- [ ] Adicionar modelo e migrar
- [ ] Todas as alterações a `Wallet.balance` passam a criar também um `WalletTransaction`
- [ ] UI: histórico de transações no WalletSheet

---

### 2.4 — Trust & Safety

- [ ] Adicionar campos ao `User`: `isStudentVerified`, `isIdentityVerified`, `suspendedAt`, `suspensionReason`
- [ ] Modelo `Report` para denúncias entre utilizadores
- [ ] Lógica de moderação básica (admin flags)

---

## Fase 3 — Scale & Operação

- [ ] Cache no NestJS (`CacheModule`) para endpoints read-heavy (pesquisa de rides)
- [ ] Job queue (BullMQ) para envio de emails/notificações assíncronos
- [ ] Object storage (S3-compatible) para avatars e documentos
- [ ] Observabilidade: structured logging, error tracking (Sentry)
- [ ] Rate limiting por utilizador (já existe `@nestjs/throttler`, afinar regras)
- [ ] CI/CD pipeline com testes automatizados

---

## Ordem de implementação recomendada

```
1. PostgreSQL          ← sem isto, tudo o resto fica comprometido
2. Transações bookings ← bug potencial em produção
3. Inbox no backend    ← feature central do produto
4. Ratings             ← confiança = produto
5. Geodata             ← search e matching de qualidade
6. Realtime (SSE)      ← UX moderna
7. Ledger pagamentos   ← quando pagamentos forem reais
8. Trust & Safety      ← quando tiveres utilizadores reais
9. Scale               ← quando tiveres problemas de scale
```

---

## Estado de implementação

| # | Item | Estado | PR/Commit |
|---|---|---|---|
| 1.1 | PostgreSQL | ✅ Concluído | docker compose + prisma migrate init-postgres |
| 1.2 | Transações bookings | ✅ Concluído | SELECT FOR UPDATE + cancel atómico |
| 1.3 | Inbox no backend | ✅ Concluído | Conversation/Message/Participant + InboxModule + polling frontend |
| 1.4 | Ratings | ✅ Concluído | POST /ratings + GET /ratings/users/:id + RatingsSheet view/submit |
| 2.1 | Geodata | ✅ Concluído | Location model + lat/lng opcional em Ride + Haversine search + LocationInput component |
| 2.2 | Realtime SSE | ⬜ Pendente | — |
| 2.3 | Ledger pagamentos | ⬜ Pendente | — |
| 2.4 | Trust & Safety | ⬜ Pendente | — |
