/**
 * Teste end-to-end Stripe:
 * 1. Wallet topup intent → confirma com cartão de teste Stripe → webhook credita wallet
 * 2. Booking payment intent → confirma com cartão de teste → cria booking com paymentMethod=STRIPE
 *
 * Requer: backend em localhost:3000, stripe listener ativo (stripe listen --forward-to ...)
 */

import Stripe from 'stripe';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

// Ler .env manualmente
const envPath = resolve(process.cwd(), '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join('=')])
);

const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY?.startsWith('sk_')) {
  console.error('❌ STRIPE_SECRET_KEY não configurada no .env');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' });

let passed = 0;
let failed = 0;

function ok(label) { console.log(`  ✅ ${label}`); passed++; }
function fail(label, err) { console.log(`  ❌ ${label}: ${err?.message ?? err}`); failed++; }

function rand() { return Date.now() + Math.random().toString(36).slice(2, 6); }

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message ?? JSON.stringify(data)), { status: res.status });
  return data;
}

async function setup() {
  // Criar e autenticar dois utilizadores (driver + passenger)
  const id = rand();
  const driver = { email: `driver_${id}@test.com`, password: 'Pass1234!', name: 'Driver Test', phone: `+3519${Math.floor(10000000 + Math.random() * 89999999)}` };
  const passenger = { email: `pass_${id}@test.com`, password: 'Pass1234!', name: 'Passenger Test', phone: `+3519${Math.floor(10000000 + Math.random() * 89999999)}` };

  await req('POST', '/auth/register', driver);
  const driverLogin = await req('POST', '/auth/login', { email: driver.email, password: driver.password });

  await req('POST', '/auth/register', passenger);
  const passLogin = await req('POST', '/auth/login', { email: passenger.email, password: passenger.password });

  // Verificar emails (test mode — usa o token do utilizador)
  await req('POST', '/auth/test/verify-email', {}, driverLogin.accessToken);
  await req('POST', '/auth/test/verify-email', {}, passLogin.accessToken);

  // Aceitar políticas
  await req('POST', '/auth/me/accept-policy', { role: 'driver' }, driverLogin.accessToken);
  await req('POST', '/auth/me/accept-policy', { role: 'passenger' }, passLogin.accessToken);

  return { driverToken: driverLogin.accessToken, passengerToken: passLogin.accessToken };
}

// ─── TESTE 1: Wallet topup via Stripe ──────────────────────────────────────

async function testWalletTopup(passengerToken) {
  console.log('\n📦 Teste 1 — Wallet topup via Stripe');

  let piId;

  // 1a. Criar intent
  try {
    const intent = await req('POST', '/wallet/topup/intent', { amount: 20 }, passengerToken);
    if (!intent.clientSecret || !intent.paymentIntentId) throw new Error('Resposta inválida: ' + JSON.stringify(intent));
    piId = intent.paymentIntentId;
    ok(`POST /wallet/topup/intent → PI criado (${piId})`);
  } catch (e) { fail('POST /wallet/topup/intent', e); return; }

  // 1b. Confirmar pagamento com cartão de teste (via Stripe SDK diretamente)
  try {
    await stripe.paymentIntents.confirm(piId, { payment_method: 'pm_card_visa' });
    ok('Pagamento confirmado via Stripe SDK (pm_card_visa)');
  } catch (e) { fail('Confirmar pagamento Stripe', e); return; }

  // 1c. Aguardar webhook creditar wallet (stripe listen precisa estar ativo)
  await new Promise(r => setTimeout(r, 3000));

  try {
    const wallet = await req('GET', '/wallet', null, passengerToken);
    if (Number(wallet.balance) >= 20) {
      ok(`Wallet creditada via webhook → saldo: €${Number(wallet.balance).toFixed(2)}`);
    } else {
      fail('Wallet não creditada', new Error(`Saldo atual: €${Number(wallet.balance).toFixed(2)} (esperado ≥ €20) — confirma que o stripe listener está ativo`));
    }
  } catch (e) { fail('GET /wallet após topup', e); }
}

// ─── TESTE 2: Booking pago diretamente com Stripe ──────────────────────────

async function testBookingStripePayment(driverToken, passengerToken) {
  console.log('\n📦 Teste 2 — Booking pay-per-ride via Stripe');

  // Criar veículo e boleia como driver
  let rideId;
  try {
    const vehicle = await req('POST', '/vehicles', { brand: 'Tesla', model: 'Model 3', seats: 4, color: 'Branco' }, driverToken);
    const dep = new Date(Date.now() + 86400000 * 2).toISOString();
    const ride = await req('POST', '/rides', {
      origin: 'Lisboa', destination: 'Porto',
      departureTime: dep, availableSeats: 3,
      vehicleId: vehicle.id, price: 8, platformFee: 0.8,
    }, driverToken);
    rideId = ride.id;
    ok(`Boleia criada (${rideId})`);
  } catch (e) { fail('Criar boleia', e); return; }

  // Criar booking intent
  let piId;
  try {
    const intent = await req('POST', `/bookings/rides/${rideId}/intent`, { seats: 1 }, passengerToken);
    if (!intent.clientSecret || !intent.paymentIntentId) throw new Error('Resposta inválida');
    piId = intent.paymentIntentId;
    ok(`POST /bookings/rides/${rideId}/intent → PI criado (${piId})`);
  } catch (e) { fail('POST /bookings/rides/:id/intent', e); return; }

  // Confirmar pagamento via Stripe SDK
  try {
    await stripe.paymentIntents.confirm(piId, { payment_method: 'pm_card_visa' });
    ok('Pagamento de reserva confirmado via Stripe SDK');
  } catch (e) { fail('Confirmar pagamento de reserva', e); return; }

  // Criar booking com o PI confirmado
  try {
    const booking = await req('POST', `/bookings/rides/${rideId}`, { seats: 1, stripePaymentIntentId: piId }, passengerToken);
    if (booking.paymentMethod !== 'STRIPE') throw new Error(`paymentMethod esperado STRIPE, recebido: ${booking.paymentMethod}`);
    ok(`Booking criado com paymentMethod=STRIPE (id: ${booking.id})`);
  } catch (e) { fail('POST /bookings/rides/:id com stripePaymentIntentId', e); return; }

  // Verificar que não é possível reutilizar o mesmo PI
  try {
    await req('POST', `/bookings/rides/${rideId}`, { seats: 1, stripePaymentIntentId: piId }, passengerToken);
    fail('Double-use do PI', new Error('Devia ter lançado erro mas não lançou'));
  } catch (e) {
    if (e.status === 400) ok('Double-use do mesmo PI corretamente rejeitado');
    else fail('Double-use do PI — erro inesperado', e);
  }
}

// ─── RUNNER ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔷 HopOn — Stripe Integration Test');
  console.log(`   API: ${API_BASE}`);
  console.log('   ⚠️  Certifica-te que o stripe listener está ativo para o teste do webhook\n');

  let driverToken, passengerToken;
  try {
    console.log('⚙️  A criar utilizadores de teste...');
    ({ driverToken, passengerToken } = await setup());
    ok('Utilizadores criados e autenticados');
  } catch (e) {
    fail('Setup', e);
    process.exit(1);
  }

  await testWalletTopup(passengerToken);
  await testBookingStripePayment(driverToken, passengerToken);

  console.log(`\n${'─'.repeat(45)}`);
  console.log(`  Resultados: ${passed} ✅  ${failed} ❌`);
  console.log('─'.repeat(45));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1); });
