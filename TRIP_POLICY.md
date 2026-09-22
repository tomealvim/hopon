# HopOn - Trip Policy

> Reference document for technical implementation and legal text in the app.
> All rules defined here must be explicitly accepted by the user before they can book or publish a ride.

---

## 1. Business Model

### 1.1 Base principle
HopOn is a **cost-sharing** platform, not a paid transport service.
The driver **does not earn money** - they only recover the actual costs of the trip (fuel + tolls).
HopOn charges a **10%** service fee on the price per seat, paid by the passenger.

### 1.2 Price calculation formula

```
custo_combustivel = (consumo_L/100km ÷ 100) × distância_real_km × preço_combustivel_hoje (DGEG)
custo_portagens   = valor real calculado pela Google Maps Routes API para a rota escolhida
custo_total       = custo_combustivel + custo_portagens

preço_por_lugar   = custo_total ÷ nº_lugares_disponíveis
comissão_hopon    = preço_por_lugar × 10%
passageiro_paga   = preço_por_lugar + comissão_hopon
condutor_recebe   = preço_por_lugar (100% do custo de recuperação)
hopon_recebe      = comissão_hopon
```

### 1.3 Variables by fuel type

| Type | Calculation |
|---|---|
| Petrol 95 | consumption (L/100km) × DGEG petrol 95 price |
| Diesel | consumption (L/100km) × DGEG diesel price |
| LPG | consumption (L/100km) × DGEG LPG price |
| Electric | consumption (kWh/100km) × average electricity price in Portugal |
| Hybrid | combined consumption (L/100km) × DGEG petrol 95 price |

> **Fuel price source:** public DGEG (Direção-Geral de Energia e Geologia) API - updated weekly.
> **Vehicle consumption source:** entered by the driver when registering the car (real-world consumption, not WLTP).

### 1.4 Price transparency
The passenger always sees the full breakdown before confirming:
```
Combustível:   €X.XX
Portagens:     €X.XX
Taxa de serviço (10%): €X.XX
─────────────────────
Total por lugar: €X.XX
```

---

## 2. Routes and Traffic

### 2.1 Route selection when creating a ride
When creating a ride, the driver chooses the route based on real traffic data predicted for the departure time.

The app presents up to 3 alternatives via the **Google Maps Routes API** with `departureTime`:
- Fastest route (recommended)
- Alternative route (e.g. fewer tolls)
- Toll-free route (if one exists)

Each option shows: actual distance, estimated time with traffic, toll cost, and the resulting price per seat.

### 2.2 Changing the route after booking

**Rules:**
- The driver can only change the route **once** after the ride has confirmed passengers.
- When the driver proposes a new route, all passengers receive a **mandatory push notification**.
- Each passenger has **24 hours** to accept or decline.
- If the passenger **does not respond within 24 hours**, the money stays with the driver and the passenger is automatically removed from the trip.

**If the new route is more expensive:**
- The passenger pays the difference if they accept.
- If they decline, they leave the trip and receive a full refund.

**If the new route is cheaper:**
- The passenger receives a refund of the difference to the original payment method.
- If it wasn't paid by card, it's credited as balance in the app wallet.

**Price redistribution when a passenger leaves:**
- Whenever a passenger leaves (by declining the route change or cancelling), the price per seat is recalculated for the remaining passengers.
- All remaining passengers receive a mandatory push notification with the new price and must accept it to stay on the trip.

---

## 3. Cancellation Policy - Passenger

| Time of cancellation | Refund to passenger | To the driver |
|---|---|---|
| More than 2h before departure | 100% | 0% |
| Between 30 minutes and 2h before departure | 50% | 50% |
| Less than 30 minutes before departure | 0% | 100% |
| No-show (doesn't show up at the pickup point) | 0% | 100% |

> The refund is returned to the **original payment method** (card/MB WAY).
> If that isn't possible (e.g. expired method), the amount is credited as **balance in the app wallet**.

---

## 4. Cancellation Policy - Driver

| Time of cancellation | Consequence |
|---|---|
| At any point before departure | Full refund (100%) to all passengers |
| Frequent cancellations | Penalty on the profile (reduced reliability badge) |

> The driver cannot cancel for only some passengers - a cancellation is always total.

---

## 5. No-Show Policy (Passenger doesn't show up)

### Mandatory flow:
1. At departure time, the driver taps **"I'm at the meeting point"** in the app.
2. The passenger receives an immediate push notification: *"Your driver is waiting for you at [location]!"*
3. A **10-minute** window is counted.
4. If the passenger doesn't show up, the driver taps **"Passenger didn't show up"**.
5. The passenger's money is transferred to the driver immediately.
6. The passenger receives a notification: *"You missed your ride. The amount will not be refunded."*
7. The driver can leave.

> **Why 10 minutes?** The driver has their own schedule (work, school). Waiting longer would be unfair.

---

## 6. Policy Acceptance by the User

### 6.1 At registration (all users)
- General Terms and Conditions
- Privacy Policy (GDPR)

### 6.2 Before the first booking as a passenger
Mandatory policy page with an explicit checkbox:
- Cancellation policy (table with %, deadlines)
- No-show policy (10 min, no refund)
- How refunds work
- Acceptance of route changes (24h to respond)

**The user cannot proceed without selecting the acceptance option.**

### 6.3 Before publishing the first ride as a driver
Mandatory policy page with an explicit checkbox:
- Responsibility to show up at the meeting point
- Only 1 route change allowed
- Cancellation rules for the driver
- How and when they receive the money

**The driver cannot publish rides without selecting the acceptance option.**

---

## 7. Payments and Refunds

### 7.1 Supported methods (to be implemented)
- Credit/debit card (Stripe)
- MB WAY (Stripe Portugal / direct integration)
- HopOn wallet balance

### 7.2 When the money moves

| Event | Movement |
|---|---|
| Passenger confirms booking | Immediate debit from the passenger (amount held) |
| Trip completed | Credit to the driver |
| Cancellation with refund | Returned to the original card (3-5 business days) or wallet |
| No-show | Immediate transfer to the driver |
| Route change accepted (more expensive) | Difference debited from the passenger |
| Route change - passenger leaves | Full refund to the passenger |

### 7.3 HopOn commission
- **10%** on the price per seat
- Paid by the passenger (added to the base price)
- Always visible in the breakdown before confirming

---

## 8. Additional Rules

### 8.1 Manual price ceiling
The driver can adjust the suggested price, but **can never exceed 20% above the automatically calculated value**.
The app blocks submission if the entered price exceeds that limit.

```
preço_máximo_permitido = preço_sugerido × 1.20
```

### 8.2 Minimum booking lead time
A passenger can book a ride up to **10 minutes before** the departure time.
After that, the ride automatically closes to new bookings.

### 8.3 No-show disputes
If the passenger disputes a no-show, the flow is:

1. The payment is **held for 2 hours** before being transferred to the driver.
2. The passenger has those 2 hours to open a dispute in the app.
3. The app automatically verifies via **GPS**:
   - Was the driver at the meeting point? (app's GPS at the time)
   - Was the passenger more than X metres away from the location? (app's GPS at the time)
4. If the GPS data is conclusive → automatic resolution.
5. If there's doubt → the HopOn team reviews and decides within 24h.
6. During the dispute, the money is held by the platform.

### 8.4 Cancellation due to force majeure (driver)
If the driver has to cancel due to an emergency (accident, illness, etc.):
- All passengers receive a **full refund**.
- The driver is **not penalised** on their profile if they provide valid proof (accident photo, medical document, etc.).
- The driver submits the proof in the app → the HopOn team validates it within 24h.
- Without proof → normal cancellation (penalises the profile).

### 8.5 Disclaimer - Insurance
HopOn is a platform that mediates cost-sharing between private individuals.
HopOn is **not responsible** for accidents, damage, or injuries occurring during trips.
Vehicle insurance is the exclusive responsibility of the driver.
Users explicitly accept this point when registering.

---

## 10. Vehicle Data Required for Calculation

For the calculation to be accurate, the driver must fill in when registering the car:

| Field | Example | Required |
|---|---|---|
| Make | Toyota | ✅ |
| Model | Corolla | ✅ |
| Year | 2021 | ✅ |
| Fuel type | Diesel | ✅ |
| Real average consumption | 5.5 L/100km | ✅ |
| Licence plate | AA-00-BB | ✅ |
| Number of seats | 5 | ✅ |

> The real average consumption is entered by the driver - it's the value they know from day-to-day use, not the WLTP value from the manual.

---

## 11. Summary of Rules for In-App Communication

Suggested text to show the user:

> **How is the price calculated?**
> The price of each seat is calculated based on the driver's car's actual fuel consumption, at the current price in Portugal, plus the tolls for the route. We add a 10% service fee. The driver doesn't profit - they only recover what they spend.

> **What if I need to cancel?**
> You can cancel for free up to 2h before. Between 30 minutes and 2h before, you get half back. Under 30 minutes, there's no refund (the driver has to be compensated for the empty seat you left).

> **What if I don't show up?**
> The driver will wait 10 minutes. If you don't arrive, you lose the trip's value with no refund.

---

*Last updated: 2026-03-02*
*This document is the source of truth for all payment, cancellation and route implementations in HopOn.*
