# HopOn — Guia de Fluxos para Figma

> Documento de referência com todos os ecrãs, estados e transições da app HopOn.
> Usar como base para construir o Figma.

---

## Como estruturar no Figma

- Uma **Page** por fluxo principal (Onboarding, Auth, Discover, Rides, Inbox, Profile, Sheets globais)
- Frames a **390×844px** (iPhone 14 Pro) ou 375×812px (iPhone X)
- Usar **componentes** para Bottom Nav, Header, Botões, Cards
- Usar **variantes de componente** para estados (loading / empty / filled / error)
- Usar o plugin **Autoflow** para ligar frames com setas de navegação

---

## Inventário completo de frames (~87 frames totais)

| # | Screen | Variantes / estados |
|---|--------|---------------------|
| 1 | Onboarding | 4 slides |
| 2 | Auth | Login / Registo / OTP |
| 3 | Profile Setup | 4 steps |
| 4 | Welcome sheet | — |
| 5 | Discover | Para ti / Todas / Pedidos / Loading / Empty |
| 6 | Filtros sheet | — |
| 7 | Ride detail / Reservar sheet | — |
| 8 | Policy Acceptance | Passageiro / Condutor |
| 9 | Rides — Condutor | Calendar / Requests / Rides list |
| 10 | Rides — Passageiro | Bookings list |
| 11 | Ride detalhe — condutor | Reservas / Acoes |
| 12 | Presence confirm banner | — |
| 13 | Rating sheet | — |
| 14 | Inbox — lista | Loading / Empty / Filled |
| 15 | Inbox — thread | — |
| 16 | Profile | Completo |
| 17 | Veiculo form sheet | — |
| 18 | Wallet sheet | — |
| 19 | Referral sheet | — |
| 20 | Communities sheet | Lista / Criar / Entrar / Gerir |
| 21 | Notifications sheet | Loading / Empty / Filled |
| 22 | Offer Ride Form | Loading preco / Resultado |
| 23 | Composer sheet | — |
| 24 | Ride Request sheet | Form / Success |
| 25 | Save Route sheet | Form / Success |
| 26 | Public Profile | Loading / Error / Main |
| 27 | Ride Share Preview | Loading / Private / Available / Full |
| 28 | Terms sheet | — |

---

## Fluxo 1 — Primeiro acesso (unauthenticated)

```
Onboarding slide 1
  → Onboarding slide 2
  → Onboarding slide 3
  → Onboarding slide 4 + Terms sheet
      → Auth page (Login)
          ↕ switch
         Auth page (Registo)
          → OTP screen
              → Profile Setup step 1 (foto + nome)
              → Profile Setup step 2 (telefone)
              → Profile Setup step 3 (localizacao)
              → Profile Setup step 4 (confirmacao)
                  → Welcome sheet
                      → App principal (Discover)
```

---

## Fluxo 2 — Navegacao principal (Bottom Nav)

```
Bottom Nav presente em todas as 4 tabs + botao "+"

[ Explorar ]  [ Boleias ]  [ + ]  [ Mensagens ]  [ Perfil ]

"+" abre o Composer sheet:
  → "Oferecer boleia"   → Offer Ride Form sheet
  → "Template recorrente" → navega para aba Rides
  → "Pedir boleia"      → Ride Request sheet
```

---

## Fluxo 3 — Discover (passageiro)

```
Discover — "Para ti" (feed personalizado)
  ↔ Discover — "Todas" (todas as boleias)
  ↔ Discover — "Pedidos" (ride requests publicados)

  → Icone filtro → Filtros sheet
  → Card de boleia → Detalhe / Reservar sheet
      → Policy Acceptance sheet (so na 1a vez)
      → Pagamento Stripe
      → Confirmacao de reserva (PENDING)
  → Avatar do condutor → Perfil publico (/u/:id)
  → Botao "Guardar rota" → Save Route sheet
  → Botao "Pedir boleia" → Ride Request sheet
```

---

## Fluxo 4 — Oferecer boleia (condutor)

```
Tap [+] → Composer sheet → "Oferecer boleia"
  → Offer Ride Form
      1. Selecionar veiculo (se tiver mais que um)
      2. Origem (LocationInput)
      3. Destino (LocationInput)
      4. Data + hora
      5. Lugares disponiveis (1-6)
      6. Calcular preco → loading → opcoes de rota
      7. Selecionar rota → preco sugerido
      8. Ajustar preco final
      9. Opcoes:
           - Instant booking (sim/nao)
           - Aceitar desvios (slider 0-60min)
           - Ponto de encontro (texto)
           - Recorrente (toggle + dias da semana)
           - Observacoes
           - Preferencias (musica, conversa, mala, animais)
           - Visibilidade (publica / privada para comunidade)
      → Policy Acceptance sheet (so na 1a vez como condutor)
      → Publicar → boleia criada → aparece no feed
```

---

## Fluxo 5 — Rides (condutor)

```
Rides tab — vista condutor
  ├── Calendario (semana/mes)
  │     → Tap num dia → lista de boleias desse dia
  │
  ├── Pedidos de passageiros (ride requests que batem com rotas)
  │     → Aceitar pedido → passageiro notificado
  │     → Recusar pedido → passageiro notificado
  │
  └── Minhas boleias (SCHEDULED)
        → Detalhes da boleia
            ├── Lista de reservas
            │     ├── PENDING → Confirmar → CONFIRMED
            │     ├── PENDING → Recusar → DECLINED
            │     └── CONFIRMED → passageiro pode cancelar
            │
            ├── Acoes em tempo real (no dia da boleia):
            │     ├── "Estou a caminho" → push para passageiros
            │     └── "Cheguei ao ponto" → push + countdown 10min
            │
            ├── Completar boleia → COMPLETED
            │     ├── Passageiros recebem push para avaliar
            │     ├── Passageiros confirmam presenca (banner)
            │     └── Condutor pode avaliar passageiros
            │
            └── Cancelar boleia
                  → Reembolso automatico
                  → Todos os passageiros notificados
```

---

## Fluxo 6 — Rides (passageiro)

```
Rides tab — vista passageiro
  └── Minhas reservas
        ├── PENDING (a aguardar confirmacao do condutor)
        │     → Cancelar reserva → reembolso 100%
        │
        ├── CONFIRMED
        │     → Chat com condutor (Inbox)
        │     → Ver estado em tempo real:
        │           "Condutor a caminho" (notificacao push)
        │           "Condutor chegou" (notificacao push + 10min timer)
        │     → Cancelar
        │           >2h antes  → reembolso 100%
        │           30min-2h   → reembolso 50%
        │           <30min     → sem reembolso
        │
        └── COMPLETED
              ├── Banner de confirmacao de presenca
              │     → "Estive la" → presenca confirmada
              │     → "Nao embarquei" → condutor notificado
              │
              └── Avaliar condutor (se ainda nao avaliou)
                    → Sheet: estrelas 1-5 + tags + comentario
                    → Submeter → rating guardado
```

---

## Fluxo 7 — Inbox

```
Inbox tab
  ├── "Pedidos" — arranjos propostos pelo smart matching
  │     → Thread
  │           → Aceitar arranjo → boleia criada automaticamente
  │           → Recusar arranjo
  │
  ├── "Viagens" — conversas ligadas a boleias especificas
  │     → Thread → Chat livre entre condutor e passageiro
  │
  └── "Pessoas" — mensagens diretas
        → Thread → Chat livre
```

---

## Fluxo 8 — Perfil

```
Profile tab
  │
  ├── Editar perfil
  │     → Sheet: nome, foto, bio, telefone, endereco
  │
  ├── Verificacoes
  │     → Email OTP → introduzir codigo → verificado
  │     → Identidade (BI/CC) → upload foto → pendente → aprovado/rejeitado (admin)
  │     → Carta de conducao → upload → pendente → aprovado/rejeitado (admin)
  │
  ├── Veiculos
  │     → Adicionar veiculo → formulario (marca, modelo, cor, matricula, foto)
  │     → Editar veiculo
  │     → Eliminar veiculo
  │
  ├── Carteira
  │     → Ver saldo + historico de transacoes
  │     → Carregar saldo → Stripe → confirmacao
  │
  ├── Referral
  │     → Ver codigo unico
  │     → Partilhar codigo (navigator.share)
  │     → Aplicar codigo de amigo → bonus de 1 euro apos 1a boleia
  │
  ├── Notificacoes push
  │     → 4 toggles: Mensagens / Reservas / Boleias / Sugestoes
  │
  ├── Comunidades
  │     → Lista das minhas comunidades
  │           → Gerir (owner): link de convite, aprovacao de membros
  │           → Partilhar link de convite
  │     → Criar comunidade: nome, descricao, aprovacao manual
  │     → Entrar com codigo → preview → pedir entrada → aguardar aprovacao
  │
  ├── Templates de viagem (rotas recorrentes)
  │     → Criar template → dias + hora + origem + destino
  │     → Gerar boleia a partir de template
  │
  ├── Avaliacoes recebidas
  │     → Lista de ratings com comentarios
  │
  └── Logout
```

---

## Fluxo 9 — Deep links (entrada externa)

```
/ride/:id
  → Ride Share Preview
      ├── Nao logado → "Entrar no HopOn" → Auth → redirect de volta
      ├── Disponivel + logado → "Reservar lugar" → Discover flow
      └── Sem lugares / Concluida → botao desativado

/u/:id
  → Perfil publico (overlay sobre a app)
      → Botao partilhar (navigator.share)
      → Fechar → volta ao ecra anterior

/ref/:code
  → Guarda codigo em localStorage
  → Se nao logado → Auth → apos login aplica codigo automaticamente
  → Se logado → aplica codigo imediatamente

/join/:code
  → Communities sheet com codigo pre-preenchido
  → Preview da comunidade → pedir para entrar
```

---

## Fluxo 10 — Notificacoes (sistema global)

```
Icone sino no header (com badge de nao lidas)
  → Sheet de notificacoes
      ├── Loading
      ├── Empty: "Sem notificacoes"
      └── Lista de notificacoes
            → Tap → marca como lida + navega para contexto:
                  booking.*        → aba Rides
                  message.new      → aba Inbox
                  match.*          → aba Discover
                  arrangement.*    → aba Discover / Rides
                  ride.*           → aba Rides
            → "Marcar todas como lidas"

Push notifications (sistema operativo — mesmo com app fechada):
  → Nova reserva na minha boleia           → abre aba Rides
  → Reserva confirmada / recusada          → abre aba Rides
  → Condutor a caminho / chegou            → abre aba Rides
  → Boleia cancelada                       → abre aba Rides
  → Nova mensagem                          → abre aba Inbox
  → Match encontrado / arranjo proposto    → abre aba Discover
  → Avaliar condutor (apos boleia)         → abre sheet de avaliacao diretamente
```

---

## Componentes globais reutilizaveis (criar como componentes Figma)

| Componente | Variantes |
|---|---|
| Bottom Nav | Default / Tab ativo (x4) |
| Header | Com sino + badge / Sem badge |
| Card de boleia | Default / Loading skeleton |
| Card de reserva | PENDING / CONFIRMED / COMPLETED / CANCELLED |
| Avatar | Com foto / Iniciais / Loading |
| Badge de verificacao | Verificado / Pendente / Nao verificado |
| Badge de estado | SCHEDULED / ACTIVE / COMPLETED / CANCELLED |
| Rating stars | 1-5 estrelas + half stars |
| Sheet container | — |
| Botao primario | Default / Loading / Disabled |
| Botao secundario | Default / Disabled |
| Input de texto | Default / Focus / Error / Filled |
| Location input | Default / Loading / Filled |
| Toggle / Switch | On / Off |
| Empty state | Icone + texto |
| Loading skeleton | Card / Row / Full page |
