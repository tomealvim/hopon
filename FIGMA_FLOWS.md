# HopOn — App Design Guide for Uizard AutoDesigner

## App Overview

**HopOn** is a daily carpooling PWA (Progressive Web App) for commuters in Portugal. It connects drivers and passengers who share the same daily route to work or university — a cost-sharing alternative to public transport, not a taxi service.

**App type:** Mobile-first PWA, installed on home screen, works like a native app
**Platform:** iOS + Android (via browser, fullscreen PWA)
**Language:** Portuguese (PT)
**Target users:** Daily commuters aged 18-40, workers and university students

---

## Design Language

**Style:** Clean minimalist. White backgrounds, black as the only accent color. No gradients. High contrast. Inspired by Linear and Notion — functional, not decorative.

**Color palette:**
- Background: `#FFFFFF` (pure white)
- Primary text: `#111827` (near black)
- Secondary text: `#6B7280` (gray-500)
- Border / dividers: `#E5E7EB` (gray-200)
- Primary button: `#111827` background, `#FFFFFF` text
- Secondary button: white background, `#111827` border and text
- Danger button: `#EF4444` (red-500)
- Success / green accent: `#16A34A` (green-600)
- Warning / amber accent: `#D97706` (amber-600)
- Brand badge: `#111827` background, white text
- Unread badge: `#EF4444` (red dot)
- Input background: white, border `#D1D5DB`, focus border `#111827`
- Skeleton loading: `#F3F4F6` animated pulse

**Typography:**
- Font: System font stack (SF Pro on iOS, Roboto on Android)
- Headings: Bold, 18-22px
- Body: Regular, 14-15px
- Meta / captions: 12-13px, gray

**Spacing:** 16px base padding on all screens. Cards have 12px internal padding. Bottom navigation height 64px + safe area.

**Corner radius:** 12px for cards and sheets, 8px for buttons and inputs, 9999px for badges/pills.

**Icons:** Lucide icon set (outlined, 20px)

**Sheets / modals:** Bottom sheets that slide up, with drag handle, rounded top corners (20px), max 90% screen height, scrollable content.

---

## Global Components (reuse across all screens)

### Bottom Navigation Bar
Fixed at bottom. 5 items: Explorar (compass icon), Boleias (car icon), + button (large black circle, elevated, center), Mensagens (chat icon), Perfil (person icon). Active tab has bold label. The + button is a large black filled circle, slightly elevated above the bar.

### App Header (Rides and Inbox screens only)
Sticky top bar. Left: "HopOn" bold wordmark. Right: bell icon button (with red badge showing unread count), user avatar circle (shows initials or photo).

### Ride Card (EntityCard)
White card with light border. Left side: avatar circle with vehicle initials. Right side: title (origin → destination), subtitle (date + time), meta text (available seats, price). Bottom: row of colored badge pills. Two action buttons at bottom right.

### Booking Card
Similar to ride card but shows passenger name, booking status badge (PENDING=amber, CONFIRMED=green, COMPLETED=gray, CANCELLED=red), and action buttons contextual to status.

### Sheet Container
Bottom sheet. Drag handle at top center (short gray bar). Title row with close X button. Scrollable content area. Optional sticky footer with action buttons.

---

## Screen Inventory

---

### SCREEN 1 — Onboarding (Slide 1 of 4)
**Purpose:** First impression, explain the app concept
**Layout:** Full white screen. Top: large illustration or icon (car + people). Center: large bold headline "Vamos viajar juntos". Subtitle text explaining carpooling concept. Bottom: progress dots (4 dots, first active). Large black "Continuar" button. Skip link.

---

### SCREEN 2 — Onboarding (Slide 2 of 4)
**Purpose:** Explain finding a ride
**Layout:** Same structure. Icon: search/map. Headline: "Encontra uma boleia". Subtitle: "Descobre condutores que fazem o teu trajeto todos os dias. Reserva o teu lugar e vai sem stress."

---

### SCREEN 3 — Onboarding (Slide 3 of 4)
**Purpose:** Explain offering a ride
**Layout:** Same structure. Icon: car/route. Headline: "Publica a tua boleia". Subtitle: "Partilha o teu trajeto diario com passageiros verificados. Dividem os custos, tu conduzes."

---

### SCREEN 4 — Onboarding (Slide 4 of 4) + Terms
**Purpose:** Accept terms before proceeding
**Layout:** Headline: "Pronto para comecar?". Checkbox row: "Li e aceito os Termos e Condicoes" with a blue underlined link that opens the Terms sheet. Large black "Comecar" button (disabled until checkbox ticked). Progress dots (4th active).

---

### SCREEN 5 — Auth Page — Login
**Purpose:** Sign in to existing account
**Layout:** Top: HopOn logo/wordmark centered. Tabs: "Entrar" (active, underlined) | "Registar". Form: Email input field, Password input field with show/hide toggle. Large black "Entrar" button. Divider "ou". Google button (white, border, Google G logo multicolor). Bottom link: "Esqueci a password".

---

### SCREEN 6 — Auth Page — Register
**Purpose:** Create new account
**Layout:** Same as login but "Registar" tab active. Form: Name input, Email input, Password input, Confirm password input. Large black "Criar conta" button. Google button below. Fine print about terms.

---

### SCREEN 7 — Auth Page — OTP Verification
**Purpose:** Verify email with 6-digit code
**Layout:** Back arrow top left. Title: "Verifica o teu email". Subtitle: "Enviamos um codigo para [email]". 6 separate input boxes for digits (large, centered, monospace font). Error message area (red text). "Reenviar codigo" link. "Voltar" link at bottom.

---

### SCREEN 8 — Profile Setup — Step 1 (Identity)
**Purpose:** Add name and photo
**Layout:** Progress bar at top (1/4 filled). Title: "O teu perfil". Avatar upload area: large circle with camera icon, tap to upload. Name text input below. "Continuar" button at bottom.

---

### SCREEN 9 — Profile Setup — Step 2 (Phone)
**Purpose:** Add phone number (optional)
**Layout:** Progress bar (2/4). Title: "Numero de telefone". Subtitle: "Opcional, mas recomendado para condutores". Phone input with country flag selector (+351 PT). Helper text: "Partilhado com passageiros confirmados". "Continuar" button. "Saltar" text link.

---

### SCREEN 10 — Profile Setup — Step 3 (Location)
**Purpose:** Set home area for route matching
**Layout:** Progress bar (3/4). Title: "A tua zona". "Usar localizacao atual" button with GPS icon (shows loading spinner when active). OR divider. Address text input with location autocomplete. When location selected: green confirmation text showing address. "Continuar" button.

---

### SCREEN 11 — Profile Setup — Step 4 (Confirmation)
**Purpose:** Review and save profile
**Layout:** Progress bar (4/4 full). Title: "Tudo pronto!". Summary card: avatar, name, email, phone (if set), location (if set). Info text: "Podes editar tudo depois no teu perfil." Error message area. Large black "Guardar perfil" button.

---

### SCREEN 12 — Welcome Sheet (first login)
**Purpose:** Onboard new user to next steps
**Layout:** Bottom sheet. Title: "Bem-vindo ao HopOn!". 3 step cards stacked: 1) Car icon + "Adiciona o teu veiculo" + description. 2) Calendar icon + "Cria um template de viagem" + description. 3) Search icon + "Explora boleias disponiveis" + description. Buttons: "Ir para o meu perfil" (primary), "Criar template" (secondary), "Explorar primeiro" (text link).

---

### SCREEN 13 — Discover — "Para Ti" tab
**Purpose:** Main feed of rides matching user's saved routes
**Layout:** Header with HopOn wordmark + bell icon + filter icon (with badge showing active filters). Below header: 3 tab pills: "Para ti" (active, bold underline), "Todas", "Pedidos". Grid of ride cards (1 column mobile, 2 column tablet). Each card: vehicle initials avatar, "Origin → Destination", date+time, seats+price meta, badges ("Condutor verificado", "X% compativel", "Instantanea"), two buttons "Reservar" and "Ver". Pull to refresh.

---

### SCREEN 14 — Discover — "Todas" tab
**Purpose:** Browse all available rides without filter
**Layout:** Same as "Para Ti" but tab "Todas" active. Shows all upcoming rides. Search bar appears at top below tabs with origin/destination fields.

---

### SCREEN 15 — Discover — "Pedidos" tab
**Purpose:** Browse ride requests published by passengers
**Layout:** Same structure. Tab "Pedidos" active. Cards show passenger requests: passenger avatar, name, "Origin → Destination", preferred time+days, brief note. Conductor can tap to propose a ride. "Publicar pedido" floating button.

---

### SCREEN 16 — Discover — Filters Sheet
**Purpose:** Filter the ride feed
**Layout:** Bottom sheet. Title: "Filtros". Fields: Origin input (LocationInput), Destination input, Date picker, Time range slider (departure time from/to), Min seats stepper, Max price slider, Toggle "Apenas condutores verificados". Footer buttons: "Limpar" (secondary) and "Aplicar filtros" (primary black).

---

### SCREEN 17 — Ride Detail / Book Sheet
**Purpose:** View ride details and book a seat
**Layout:** Bottom sheet (tall, ~85% screen). Header: "Origin → Destination" title, date+time subtitle. Driver row: avatar, name, verified badge, star rating, reliability %. Vehicle row: brand+model, color, year. Meeting point (if set). Available seats + price per seat. Preference icons row (music, conversation, luggage, animals). Action buttons: "Ver perfil do condutor" (secondary) and "Reservar lugar" (primary black). Shows "Sem lugares" (disabled) if full.

---

### SCREEN 18 — Policy Acceptance Sheet — Passenger
**Purpose:** First-time passenger accepts rules
**Layout:** Bottom sheet. Title: "Regras para passageiros". Scrollable policy sections with headings and text: Cancelamento, No-show, Taxa de servico, Comportamento, Responsabilidade. Sticky footer: checkbox "Li e aceito as regras", "Cancelar" + "Aceitar e continuar" buttons.

---

### SCREEN 19 — Policy Acceptance Sheet — Driver
**Purpose:** First-time driver accepts rules
**Layout:** Same structure as passenger policy. Title: "Regras para condutores". Sections: Cancelamento, Partilha de custos, Teto de preco, Taxa de servico, Comportamento, Seguranca.

---

### SCREEN 20 — Rides Page — Driver Tab
**Purpose:** Driver manages their published rides
**Layout:** Global header (HopOn + bell). Tab selector below header: "Condutor" (active underline) | "Passageiro". Sections stacked: 1) Calendar strip (week view, day circles, selected day highlighted black). 2) "Pedidos de boleia" section — passenger request cards with accept/decline buttons. 3) "As minhas boleias" section — grid of ride cards showing status badges, pending count badge, group chat unread badge. Large black FAB (+) button from bottom nav.

---

### SCREEN 21 — Rides Page — Passenger Tab
**Purpose:** Passenger sees their bookings
**Layout:** Same header + tabs but "Passageiro" active. Sections: 1) "Reservas confirmadas" — booking cards (CONFIRMED, green border accent). 2) "Reservas pendentes" — booking cards (PENDING, amber border). 3) "Boleias passadas" — completed booking cards in gray. Each card: driver name+avatar, route, date, status badge, action buttons.

---

### SCREEN 22 — Ride Detail Sheet — Driver View
**Purpose:** Driver sees full details and manages a specific ride
**Layout:** Bottom sheet. Tabs inside: "Boleia" | "Passageiros". Boleia tab: route, time, vehicle, seats remaining, price, meeting point, preferences. Footer buttons: "Fechar" + "Chat do grupo" (with red unread badge) + "Ver reservas (N)" + "Estou a caminho" + "Estou no ponto" + "Concluir" + "Cancelar" (shown contextually based on ride status and time).

---

### SCREEN 23 — Ride Detail Sheet — Passengers List
**Purpose:** Driver reviews and manages booking requests
**Layout:** Bottom sheet in "Passageiros" tab. List of booking rows: passenger avatar, name, pickup distance badge (green "na rota" / amber "Xm desvio" / red "Xkm fora"), time requested. Each row has "Confirmar" (green) and "Recusar" (red) buttons for PENDING bookings. CONFIRMED rows show phone number with call button.

---

### SCREEN 24 — Booking Detail Sheet — Passenger View
**Purpose:** Passenger views confirmed booking details
**Layout:** Bottom sheet. Driver card: avatar, name, verified badge, rating, phone number (tap to call). Ride info: route, date, time, meeting point. Cancellation policy reminder (amber info box showing refund % based on time). Footer buttons: "Chat do grupo" (if confirmed) + "Cancelar reserva" (danger). After ride completed: presence confirmation banner.

---

### SCREEN 25 — Presence Confirmation Banner
**Purpose:** Passenger confirms they boarded the ride
**Layout:** Amber/yellow banner card inside rides page. Title: "A boleia foi concluida - estiveste presente?". Two buttons: "Sim, estive la" (green, primary) and "Nao embarquei" (red, secondary).

---

### SCREEN 26 — Rating Sheet
**Purpose:** Rate the driver after a completed ride
**Layout:** Bottom sheet. Title: "Como foi a boleia?". Driver card at top (avatar, name). 5 star rating row (large, tappable). Tags row (pills): "Pontual", "Carro limpo", "Boa conversa", "Rota eficiente", "Condutor seguro". Comment textarea (optional). "Submeter avaliacao" button (disabled until stars selected).

---

### SCREEN 27 — Offer Ride Form
**Purpose:** Driver publishes a new ride
**Layout:** Full-height bottom sheet with scroll. Title: "Oferecer boleia". Sections: 1) Vehicle selector (radio cards if multiple vehicles). 2) Origin LocationInput. 3) Destination LocationInput. 4) Date picker + Time picker side by side. 5) Seats stepper (1-6). 6) "Calcular preco" button → loading state (spinner + "A calcular...") → route options (radio cards showing distance, duration, tolls, suggested price). 7) Price input (pre-filled with suggestion). 8) Options: Instant booking toggle, Accept detours toggle + slider, Meeting point input, Recurring toggle + day buttons (Mon-Fri), Observations textarea. 9) Preferences checkboxes. 10) Community visibility dropdown. Footer: "Cancelar" + "Publicar boleia" buttons.

---

### SCREEN 28 — Composer Sheet
**Purpose:** Choose what to create (from + button)
**Layout:** Small bottom sheet. Title: "Criar". 3 large outline buttons stacked: "Oferecer boleia" (car icon), "Pedir boleia" (hand icon), "Template recorrente" (repeat icon).

---

### SCREEN 29 — Ride Request Sheet
**Purpose:** Passenger publishes a ride need
**Layout:** Bottom sheet. Title: "Publicar pedido de boleia". Intro text. Origin LocationInput + "Usar localizacao atual" button. Destination LocationInput. Time input. Day buttons (Seg-Dom, toggleable). Note textarea (optional). "Publicar pedido" button. Success state: checkmark, "Pedido publicado!", explanation text, "Fechar" button.

---

### SCREEN 30 — Save Route Sheet
**Purpose:** Save a habitual route for smart matching
**Layout:** Bottom sheet. Optional onboarding info box (blue-gray) if first time. Title: "Guardar rota habitual". Origin LocationInput. Destination LocationInput. Typical time input. Typical days buttons. "Guardar rota" button. Success state: checkmark, "Rota guardada!", explanation, "Fechar" button.

---

### SCREEN 31 — Inbox — Conversation List
**Purpose:** All conversations organized by type
**Layout:** Global header (HopOn + bell). Page title "Mensagens". 3 sections with section headers: "Pedidos" (smart matching proposals), "Viagens" (ride conversations), "Pessoas" (direct messages). Each conversation row: avatar, title (bold if unread), last message preview (2 lines), timestamp, unread count badge (red circle). Loading: skeleton rows. Empty: icon + "Sem mensagens" text per section.

---

### SCREEN 32 — Inbox — Chat Thread
**Purpose:** Send and receive messages in a conversation
**Layout:** Header with back arrow, conversation title, info icon. Message bubbles: own messages on right (black background, white text), other's messages on left (light gray background, dark text). System messages centered (gray italic, e.g. "Joao confirmou reserva"). Timestamp shown per message. Bottom: text input + send button. Keyboard-aware layout.

---

### SCREEN 33 — Profile Page
**Purpose:** User settings, verification, vehicles, wallet
**Layout:** Scrollable page. Top: large avatar circle, name, star rating, reliability badge, "Editar perfil" button. Sections as cards/rows: 1) Verificacoes (email ✓, identity status, driver license status). 2) Veiculos (list of vehicles, "Adicionar veiculo" button). 3) Carteira (balance in euros, "Carregar" button). 4) Impacto (CO2 saved, money saved, trips). 5) Referral (code, share button). 6) Notificacoes (4 toggle rows). 7) Comunidades. 8) Templates de viagem. 9) Avaliacoes recebidas. 10) Termos / Suporte. 11) "Terminar sessao" red button. Admin panel (if admin user, at bottom).

---

### SCREEN 34 — Edit Profile Sheet
**Purpose:** Edit personal information
**Layout:** Bottom sheet. Title: "Editar perfil". Avatar with camera button. Name input. Bio textarea. Phone input. Home address LocationInput. "Guardar" button.

---

### SCREEN 35 — Vehicle Form Sheet
**Purpose:** Add or edit a vehicle
**Layout:** Bottom sheet. Title: "Adicionar veiculo" or "Editar veiculo". Fields: Brand input, Model input, Color input, Year input, License plate input. Photo upload area (optional). "Guardar veiculo" button.

---

### SCREEN 36 — Wallet Sheet
**Purpose:** View balance and transaction history
**Layout:** Bottom sheet. Balance displayed large (e.g. "€12,50"). "Carregar saldo" button (black). Transaction list: each row shows icon, description, amount (green for credit, red for debit), date. Loading skeleton. Empty state.

---

### SCREEN 37 — Referral Sheet
**Purpose:** Share referral code and apply a friend's code
**Layout:** Bottom sheet. Title: "Convida amigos". Explanation: "Tu e o teu amigo ganham €1 quando ele completar a primeira boleia." Your code displayed large in a monospace box with copy icon. "Partilhar codigo" button (black, uses native share). Count: "X amigos convidados". Divider. "Tens um codigo de amigo?" section with code input + "Aplicar" button.

---

### SCREEN 38 — Communities Sheet — List View
**Purpose:** View and manage communities
**Layout:** Bottom sheet. Title: "Comunidades". Buttons: "Criar comunidade" (black) + "Entrar com codigo" (secondary). Grid of community cards (2 cols): community name, member count, role badge (Owner/Membro), "Gerir" button (owner) or "Convidar" button. Empty state: house icon + "Sem comunidades ainda".

---

### SCREEN 39 — Communities Sheet — Create View
**Purpose:** Create a new private community
**Layout:** Back arrow + "Criar comunidade" title. Name input (60 chars max). Description textarea (optional). Toggle: "Aprovacao manual de membros". Error message. "Criar" button (disabled until name filled).

---

### SCREEN 40 — Communities Sheet — Join View
**Purpose:** Join a community with an invite code
**Layout:** Back arrow + "Entrar com codigo" title. Code input (monospace, uppercase). "Ver comunidade" button. Preview card (appears after valid code): community name, description, member count, approval info. "Pedir para entrar" button. Success state: party emoji, "Pedido enviado!", explanation, "Fechar" button.

---

### SCREEN 41 — Communities Sheet — Manage View (Owner)
**Purpose:** Community owner manages members and invite link
**Layout:** Back arrow + community name as title. Invite link section: readonly link in gray box, "Partilhar" button, "Novo codigo" button. Members section: list rows with avatar initials, name, email, role/status badge. Action buttons per member: PENDING gets "Aprovar" (green) + "Rejeitar" (red); APPROVED gets "Expulsar" (red).

---

### SCREEN 42 — Notifications Sheet
**Purpose:** In-app notification center
**Layout:** Bottom sheet. Title: "Notificacoes" + "Marcar todas como lidas" link (if unread > 0). List of notification rows: icon (emoji), bold title (if unread), body text (2 lines, gray), timestamp. Unread rows have blue dot on left. Loading state. Empty state: bell icon + "Sem notificacoes".

---

### SCREEN 43 — Public Profile Page (/u/:id)
**Purpose:** Shareable public profile for any user
**Layout:** Full screen overlay. Header: back arrow, "Perfil" title, share button. Profile hero: large avatar, name, verified badge (if verified), reliability badge, "Membro desde X". Stats grid (3 cols): rating with star, reliability %, rides count. Vehicles section: cards with brand+model, color, "N viagens". Frequent routes section: origin→destination rows with count. Reviews section: up to 5 cards with star rating, comment text, reviewer avatar+name, relative date.

---

### SCREEN 44 — Ride Share Preview (/ride/:id)
**Purpose:** Public shareable link to a specific ride
**Layout:** Full white page (no bottom nav). Header: back/home button + "Boleia partilhada" title. Route heading: large "Origin → Destination". Date+time. Badge row: availability (green/gray), price (if set), "Instantanea" badge, community badge (if private). Driver card: avatar, name, verified badge, "Condutor" label. Vehicle row: brand+model+color. Meeting point (if set). CTA: "Entrar no HopOn" (if not logged in) or "Reservar lugar" (if available) or disabled button (if full/completed).

---

## User Flow Connections

### Flow 1 — First Access
```
Onboarding 1 → 2 → 3 → 4 → Auth Login → Auth Register → OTP →
Profile Setup 1 → 2 → 3 → 4 → Welcome Sheet → Discover
```

### Flow 2 — Book a Ride (Passenger)
```
Discover "Para Ti" → Ride Card → Ride Detail Sheet →
[first time: Policy Sheet] → Payment → Booking Confirmed →
Rides Tab Passenger → [day of ride] Notifications → Presence Confirmation → Rating Sheet
```

### Flow 3 — Offer a Ride (Driver)
```
Bottom Nav [+] → Composer → Offer Ride Form →
[first time: Driver Policy Sheet] → Ride Published →
Rides Tab Driver → Booking Request arrives → Confirm/Decline →
[day of ride] "Estou a caminho" → "Estou no ponto" → "Concluir"
```

### Flow 4 — Inbox
```
Rides Tab → "Chat do grupo" button → Inbox Thread (group)
Booking confirmed → Inbox notification → Inbox Thread (1-on-1)
Bell icon → Notifications Sheet → tap notification → navigates to correct tab
```

### Flow 5 — Profile Setup
```
Profile Tab → Verificacoes → DriverLicenseSheet →
Add Vehicle → ProfileSetup done →
Create schedule template → Rides Tab shows template
```

### Flow 6 — Deep Links (external entry)
```
/ride/:id → Ride Share Preview → "Reservar lugar"
/u/:id → Public Profile overlay
/ref/:code → saves code → Auth → applies code after login
/join/:code → Communities Sheet join view with pre-filled code
```

---

## Notes for Uizard AutoDesigner

- **Design style:** Clean white minimalist mobile app, similar to Linear or Vercel's design system
- **Primary color:** Black (#111827) — used for primary buttons, active states, key text
- **No gradients, no colorful backgrounds** — everything is white with black accents
- **Sheets slide up from the bottom** — most interactions happen in bottom sheets, not new pages
- **5-tab bottom navigation** with elevated center "+" button
- **Portuguese language** — all labels, buttons and text in Portuguese (Portugal)
- **Cards with subtle borders** (1px, light gray) — no heavy shadows
- **Status badges** are colored pills: green=active/confirmed, amber=pending/warning, red=cancelled/error, black=brand/driver
