import { useState, useEffect } from "react";
import Sheet from "./Sheet";
import { Button } from "./Button";
import { apiRequest } from "../../services/api";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (opts?: { message?: string; stripePaymentIntentId?: string }) => void;
  offerTitle: string;
  rideId: string;
  price?: number | null;
  platformFee?: number | null;
  seats?: number;
  departureTime?: string | null;
};

// ── Stripe checkout embed ─────────────────────────────────────────────────────

function StripeCheckoutForm({
  onSuccess,
  onError,
  onBack,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      onError(error.message ?? "Erro ao processar pagamento.");
      setSubmitting(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form id="booking-stripe-form" onSubmit={handlePay} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { address: { country: "never" } } },
        }}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          variant="outline"
          className="flex-1"
          disabled={!stripe || submitting}
        >
          {submitting ? "A pagar…" : "Confirmar pagamento"}
        </Button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RequestSeatSheet({
  open,
  onClose,
  onConfirm,
  offerTitle,
  rideId,
  price,
  platformFee,
  seats = 1,
  departureTime,
}: Props) {
  const [message, setMessage]               = useState("");
  const [walletBalance, setWalletBalance]   = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [view, setView]                     = useState<"confirm" | "stripe">("confirm");
  const [loadingIntent, setLoadingIntent]   = useState(false);
  const [intentError, setIntentError]       = useState("");
  const [stripePromise, setStripePromise]   = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret]     = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePayError, setStripePayError] = useState("");

  const hasCost       = price != null && price > 0;
  const totalCost     = hasCost ? price * seats : 0;
  const hasEnoughWallet = walletBalance != null && hasCost && walletBalance >= totalCost;

  const hasFeeBreakdown  = hasCost && platformFee != null && platformFee > 0;
  const baseCostPerSeat  = hasFeeBreakdown ? price - platformFee! : price ?? 0;
  const totalBase        = baseCostPerSeat * seats;
  const totalFee         = hasFeeBreakdown ? platformFee! * seats : 0;

  useEffect(() => {
    if (!open || !hasCost) return;
    setBalanceLoading(true);
    apiRequest<{ balance: number }>("/wallet")
      .then((data) => setWalletBalance(Number(data.balance)))
      .catch(() => setWalletBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [open, hasCost]);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setView("confirm");
      setIntentError("");
      setStripePayError("");
      setClientSecret(null);
      setPaymentIntentId(null);
    }
  }, [open]);

  // ── Wallet path ───────────────────────────────────────────────────────────
  function handleWalletPay() {
    onConfirm({ message: message.trim() || undefined });
    setMessage("");
  }

  // ── Stripe path ───────────────────────────────────────────────────────────
  async function handleStripeInit() {
    setLoadingIntent(true);
    setIntentError("");
    try {
      const data = await apiRequest<{ clientSecret: string; publishableKey: string; paymentIntentId: string }>(
        `/bookings/rides/${rideId}/intent`,
        { method: "POST", body: JSON.stringify({ seats }) },
      );
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      const pk = data.publishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      setStripePromise(loadStripe(pk));
      setView("stripe");
    } catch (err) {
      setIntentError(err instanceof Error ? err.message : "Erro ao iniciar pagamento.");
    } finally {
      setLoadingIntent(false);
    }
  }

  function handleStripeSuccess() {
    onConfirm({ message: message.trim() || undefined, stripePaymentIntentId: paymentIntentId! });
    setMessage("");
  }

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  // ── Footer ────────────────────────────────────────────────────────────────
  // No view=stripe the form has its own buttons (Stripe form)
  const footer =
    view === "stripe" ? null : (
      <div className="space-y-2">
        {intentError && <p className="text-xs text-red-500 text-center">{intentError}</p>}

        {hasCost ? (
          <div className="flex flex-col gap-2">
            {/* Wallet button */}
            <Button
              block
              variant="outline"
              className="min-h-[48px]"
              disabled={!hasEnoughWallet || balanceLoading}
              onClick={handleWalletPay}
            >
              {balanceLoading
                ? "A verificar saldo…"
                : hasEnoughWallet
                ? `HopOn Cash  ·  €${walletBalance?.toFixed(2)}`
                : walletBalance != null
                ? `Saldo insuficiente (€${walletBalance.toFixed(2)})`
                : "HopOn Cash"}
            </Button>

            {/* Card / Apple Pay / Google Pay button */}
            <Button
              block
              variant="outline"
              className="min-h-[48px]"
              disabled={loadingIntent}
              onClick={handleStripeInit}
            >
              {loadingIntent ? "A preparar pagamento…" : "Pagar com cartão / Apple Pay"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleWalletPay}>
              Enviar pedido
            </Button>
          </div>
        )}
      </div>
    );

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={view === "stripe" ? "Pagamento" : "Pedir lugar"}
      height="lg"
      footer={footer}
    >
      <div className="grid gap-4 p-1">

        {/* ── STRIPE PAYMENT FORM ── */}
        {view === "stripe" && clientSecret && stripePromise && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">
              {offerTitle} — €{totalCost.toFixed(2)}
            </p>
            {stripePayError && <p className="text-sm text-red-600">{stripePayError}</p>}
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe", variables: { colorPrimary: "#111827" } },
                locale: "pt",
              }}
            >
              <StripeCheckoutForm
                onSuccess={handleStripeSuccess}
                onError={setStripePayError}
                onBack={() => { setView("confirm"); setStripePayError(""); }}
              />
            </Elements>
          </div>
        )}

        {/* ── CONFIRM VIEW ── */}
        {view === "confirm" && (
          <>
            <p className="text-sm text-gray-700">
              Vais pedir lugar em: <span className="font-semibold">{offerTitle}</span>
            </p>

            {hasCost && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Detalhes do custo</p>

                {hasFeeBreakdown ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Combustível + portagens ({seats} {seats > 1 ? "lugares" : "lugar"})
                      </span>
                      <span className="text-gray-700">€{totalBase.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Taxa de serviço HopOn (10%)</span>
                      <span className="text-gray-700">€{totalFee.toFixed(2)}</span>
                    </div>
                    <div className="my-1 border-t border-gray-200" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">€{totalCost.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Custo ({seats} {seats > 1 ? "lugares" : "lugar"} × €{price!.toFixed(2)})
                    </span>
                    <span className="font-semibold text-gray-900">€{totalCost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {price != null && price > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 grid gap-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Política de cancelamento</p>
                <div className="flex justify-between text-xs text-gray-700">
                  <span>Mais de 24h antes da partida</span>
                  <span className="font-semibold text-green-700">Reembolso total</span>
                </div>
                <div className="flex justify-between text-xs text-gray-700">
                  <span>Entre 2h e 24h antes</span>
                  <span className="font-semibold text-amber-700">Reembolso 50%</span>
                </div>
                <div className="flex justify-between text-xs text-gray-700">
                  <span>Menos de 2h antes</span>
                  <span className="font-semibold text-red-700">Sem reembolso</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="request-message" className="block text-xs font-semibold text-gray-700 mb-1">
                Mensagem para o condutor (opcional)
              </label>
              <textarea
                id="request-message"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                rows={3}
                placeholder="Ex.: Oi! Posso encontrar na estação. Obrigado!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={300}
                aria-label="Escrever mensagem para o condutor"
              />
              <div className="text-xs text-gray-500 mt-1 text-right">{message.length} / 300</div>
            </div>

            {!hasCost && !message && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Dica:</strong> Uma mensagem personalizada ajuda o condutor a decidir mais rapidamente!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
