import { useCallback, useEffect, useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { apiRequest } from "../../services/api";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import PayoutRequestSheet from "./PayoutRequestSheet";
import WithdrawSheet from "./WithdrawSheet";

type WalletSheetProps = {
  open: boolean;
  onClose: () => void;
};

type WalletView = "list" | "amount" | "payment" | "success" | "history";

type WalletTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT" | "REFUND" | "PAYOUT" | "PAYOUT_PENDING" | "WITHDRAW";
  amount: number;
  description: string | null;
  reference: string | null;
  createdAt: string;
};

const TX_META: Record<WalletTransaction["type"], { label: string; color: string; sign: string }> = {
  CREDIT:         { label: "Carregamento",       color: "text-emerald-600", sign: "+" },
  DEBIT:          { label: "Pagamento",           color: "text-red-500",     sign: "−" },
  REFUND:         { label: "Reembolso",           color: "text-blue-500",    sign: "+" },
  PAYOUT:         { label: "Levantamento",        color: "text-orange-500",  sign: "−" },
  PAYOUT_PENDING: { label: "Saque pendente",      color: "text-yellow-600",  sign: "−" },
  WITHDRAW:       { label: "Reembolso p/ cartão", color: "text-purple-600",  sign: "−" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Stripe checkout form ──────────────────────────────────────────────────────

function CheckoutForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      onError(error.message ?? "Erro ao processar pagamento.");
      setSubmitting(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form id="stripe-payment-form" onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { address: { country: "never" } } },
        }}
      />
      <Button
        type="submit"
        block
        variant="outline"
        className="mt-4 min-h-[48px]"
        disabled={!stripe || submitting}
      >
        {submitting ? "A processar…" : "Confirmar pagamento"}
      </Button>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function WalletSheet({ open, onClose }: WalletSheetProps) {
  const [view, setView]                     = useState<WalletView>("list");
  const [amount, setAmount]                 = useState("");
  const [balance, setBalance]               = useState<number | null>(null);
  const [transactions, setTransactions]     = useState<WalletTransaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [clientSecret, setClientSecret]     = useState<string | null>(null);
  const [stripePromise, setStripePromise]   = useState<Promise<Stripe | null> | null>(null);
  const [intentError, setIntentError]       = useState("");
  const [loadingIntent, setLoadingIntent]   = useState(false);
  const [paymentError, setPaymentError]     = useState("");
  const [payoutOpen, setPayoutOpen]         = useState(false);
  const [withdrawOpen, setWithdrawOpen]     = useState(false);

  const parsedAmount = parseFloat(amount.replace(",", ".").replace(/[^\d.]/g, "")) || 0;
  const canProceed   = parsedAmount >= 10 && parsedAmount <= 500;

  const fetchWallet = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const data = await apiRequest<{ balance: number; currency: string; transactions: WalletTransaction[] }>(
        "/wallet/transactions",
      );
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch {
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchWallet();
    } else {
      setView("list");
      setAmount("");
      setClientSecret(null);
      setIntentError("");
      setPaymentError("");
    }
  }, [open, fetchWallet]);

  async function handleProceedToPayment() {
    if (!canProceed) return;
    setLoadingIntent(true);
    setIntentError("");
    try {
      const data = await apiRequest<{ clientSecret: string; publishableKey: string }>(
        "/wallet/topup/intent",
        { method: "POST", body: JSON.stringify({ amount: parsedAmount }) },
      );
      setClientSecret(data.clientSecret);
      // Usar a publishableKey que vem do backend (ou fallback para VITE env)
      const pk = data.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      setStripePromise(loadStripe(pk));
      setView("payment");
    } catch (err) {
      setIntentError(err instanceof Error ? err.message : "Erro ao iniciar pagamento.");
    } finally {
      setLoadingIntent(false);
    }
  }

  function handlePaymentSuccess() {
    // Aguardar webhook creditar a wallet e recarregar
    setTimeout(() => fetchWallet(), 2000);
    setView("success");
  }

  // Botão do rodapé consoante a vista
  const footer =
    view === "list" ? (
      <Button block variant="outline" className="min-h-[48px]" onClick={() => setView("amount")}>
        Carregar saldo
      </Button>
    ) : view === "amount" ? (
      <div className="space-y-2">
        {intentError && <p className="text-xs text-red-500 text-center">{intentError}</p>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { setView("list"); setAmount(""); }}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={!canProceed || loadingIntent}
            onClick={handleProceedToPayment}
          >
            {loadingIntent ? "A preparar…" : "Continuar"}
          </Button>
        </div>
      </div>
    ) : view === "payment" ? (
      <Button variant="outline" className="w-full" onClick={() => setView("amount")}>
        Voltar
      </Button>
    ) : view === "success" ? (
      <Button variant="outline" className="min-h-[48px] w-full" onClick={() => { setAmount(""); setView("list"); onClose(); }}>
        Voltar ao perfil
      </Button>
    ) : (
      <Button variant="outline" className="min-h-[48px] w-full" onClick={() => setView("list")}>Voltar</Button>
    );

  return (
    <>
    <Sheet
      open={open}
      onClose={onClose}
      title={view === "history" ? "Histórico de transações" : "Carteira"}
      height="lg"
      footer={footer}
    >
      <div className="space-y-6">

        {/* ── VISTA PRINCIPAL ── */}
        {view === "list" && (
          <>
            <section className="rounded-3xl border border-[#e7e9e4] bg-[#f3f4ef] p-5">
              <p className="text-sm text-[#414844]">Hopon Cash</p>
              {loadingBalance
                ? <div className="mt-1 h-9 w-28 animate-pulse rounded-lg bg-[#edeee9]" />
                : <p className="text-3xl font-bold text-[#1A1C19]">{formatCurrency(balance ?? 0)}</p>
              }
              {transactions.length > 0 && (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => setView("history")}
                >
                  Ver histórico ({transactions.length})
                </button>
              )}
            </section>

            <div className="flex flex-col gap-2">
              <p className="text-sm text-[#717973] text-center">
                Carrega saldo com cartão, MB Way, Apple Pay ou Google Pay.
              </p>
              {(balance ?? 0) >= 1 && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#717973] underline-offset-2 hover:underline"
                    onClick={() => setWithdrawOpen(true)}
                  >
                    Reembolsar para cartão
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[#717973] underline-offset-2 hover:underline"
                    onClick={() => setPayoutOpen(true)}
                  >
                    Pedir saque para IBAN
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ESCOLHER VALOR ── */}
        {view === "amount" && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[#414844]">Valor a carregar</p>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#717973]">€</span>
              <input
                id="wallet-amount"
                inputMode="decimal"
                placeholder="Ex.: 25"
                value={amount}
                onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, "")); setIntentError(""); }}
                className="w-full rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] px-10 py-3 text-lg font-semibold text-[#1A1C19] outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/20 placeholder:text-[#717973]"
              />
            </div>
            {parsedAmount > 500 && <p className="text-xs text-red-500">Máximo €500 por carregamento.</p>}
            {parsedAmount > 0 && parsedAmount < 10 && <p className="text-xs text-red-500">Mínimo €10 por carregamento.</p>}

            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                    parsedAmount === v
                      ? "border-[#1B4332] bg-[#1B4332] text-white"
                      : "border-[#e7e9e4] bg-[#f3f4ef] text-[#414844] hover:border-[#c1c8c2] hover:bg-[#f3f4ef]",
                  )}
                >
                  €{v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PAGAMENTO STRIPE ── */}
        {view === "payment" && clientSecret && stripePromise && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[#414844]">
              Carregar {formatCurrency(parsedAmount)}
            </p>
            {paymentError && (
              <p className="text-sm text-red-600">{paymentError}</p>
            )}
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe", variables: { colorPrimary: "#111827" } },
                locale: "pt",
              }}
            >
              <CheckoutForm
                onSuccess={handlePaymentSuccess}
                onError={setPaymentError}
              />
            </Elements>
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {view === "history" && (
          <section className="space-y-2">
            {transactions.length === 0
              ? <p className="py-10 text-center text-sm text-[#717973]">Sem transações ainda.</p>
              : transactions.map((tx) => {
                  const meta = TX_META[tx.type] ?? TX_META.CREDIT;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] px-4 py-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold border border-[#e7e9e4] bg-white", meta.color)}>
                        {meta.sign}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1A1C19] truncate">{tx.description ?? meta.label}</p>
                        <p className="text-xs text-[#717973]">{formatDate(tx.createdAt)}</p>
                      </div>
                      <p className={cn("text-sm font-bold shrink-0", meta.color)}>
                        {meta.sign}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  );
                })
            }
          </section>
        )}

        {/* ── SUCESSO ── */}
        {view === "success" && (
          <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-[#1A1C19]">Pagamento recebido</p>
              <p className="text-sm text-[#414844]">O saldo será atualizado em instantes.</p>
              <p className="mt-4 text-3xl font-bold text-[#1A1C19]">{formatCurrency(balance ?? 0)}</p>
            </div>
            <button type="button" className="text-sm font-semibold text-primary underline-offset-2 hover:underline" onClick={() => { setView("list"); setAmount(""); }}>
              Fazer novo carregamento
            </button>
          </div>
        )}

      </div>
    </Sheet>

    <PayoutRequestSheet
      open={payoutOpen}
      onClose={() => setPayoutOpen(false)}
      balance={balance ?? 0}
      onSubmitted={fetchWallet}
    />

    <WithdrawSheet
      open={withdrawOpen}
      onClose={() => setWithdrawOpen(false)}
      balance={balance ?? 0}
      onSubmitted={fetchWallet}
    />
  </>
  );
}
