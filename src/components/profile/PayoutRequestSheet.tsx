import { useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { apiRequest } from "../../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  balance: number;
  onSubmitted?: () => void;
};

export default function PayoutRequestSheet({ open, onClose, balance, onSubmitted }: Props) {
  const [amount, setAmount]       = useState("");
  const [iban, setIban]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);

  const numAmount = parseFloat(amount);
  const canSubmit =
    !submitting &&
    !isNaN(numAmount) &&
    numAmount >= 1 &&
    numAmount <= balance &&
    iban.replace(/\s/g, "").length >= 15;

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      await apiRequest("/wallet/payout-request", {
        method: "POST",
        body: JSON.stringify({ amount: numAmount, iban: iban.replace(/\s/g, "") }),
      });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao submeter pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setAmount("");
    setIban("");
    setError("");
    setDone(false);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Pedir saque"
      height="lg"
      footer={
        done ? (
          <Button block variant="outline" className="min-h-[48px]" onClick={handleClose}>
            Fechar
          </Button>
        ) : (
          <div className="space-y-2">
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? "A enviar…" : "Pedir saque"}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-6">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">Pedido submetido</p>
            <p className="text-sm text-gray-500">
              A equipa HopOn irá processar o teu saque em breve. Serás notificado quando o valor for enviado.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">Saldo disponível</p>
              <p className="text-lg font-bold text-gray-900">€{balance.toFixed(2)}</p>
            </section>

            <div className="space-y-2">
              <label htmlFor="payout-amount" className="text-xs font-semibold uppercase text-gray-600">
                Valor a sacar (€)
              </label>
              <input
                id="payout-amount"
                type="number"
                min={1}
                max={balance}
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                placeholder="Ex: 25.00"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
              {!isNaN(numAmount) && numAmount > balance && (
                <p className="text-xs text-red-500">Valor superior ao saldo disponível.</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="payout-iban" className="text-xs font-semibold uppercase text-gray-600">
                IBAN
              </label>
              <input
                id="payout-iban"
                type="text"
                value={iban}
                onChange={(e) => { setIban(e.target.value.toUpperCase()); setError(""); }}
                placeholder="PT50 0000 0000 0000 0000 0000 0"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono text-gray-900 uppercase outline-none placeholder:text-gray-400 placeholder:font-sans focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            <p className="text-xs text-gray-400">
              O saldo será reservado imediatamente. A equipa HopOn processará a transferência manualmente em 2–5 dias úteis.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
