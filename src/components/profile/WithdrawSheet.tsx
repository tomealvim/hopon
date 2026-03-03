import { useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { apiRequest } from "../../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  balance: number;
  onSubmitted: () => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default function WithdrawSheet({ open, onClose, balance, onSubmitted }: Props) {
  const [amount, setAmount]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);
  const [refunded, setRefunded] = useState(0);

  const parsed = parseFloat(amount.replace(",", ".").replace(/[^\d.]/g, "")) || 0;
  const canSubmit = parsed >= 1 && parsed <= balance && !loading;

  function handleClose() {
    setAmount("");
    setError("");
    setDone(false);
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ refundedAmount: number }>("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: parsed }),
      });
      setRefunded(res.refundedAmount);
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar reembolso.");
    } finally {
      setLoading(false);
    }
  }

  const quickAmounts = [...new Set([10, 25, balance].filter((v) => v >= 1 && v <= balance))];

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Reembolsar saldo"
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
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {loading ? "A processar…" : "Reembolsar"}
              </Button>
            </div>
          </div>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Reembolso enviado</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(refunded)}</p>
            <p className="mt-2 text-sm text-gray-500">
              O valor será devolvido ao teu cartão em 5–10 dias úteis.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Devolve o saldo não utilizado ao cartão com que carregaste a carteira.
            O reembolso demora 5–10 dias úteis a aparecer na tua conta.
          </p>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-500">Saldo disponível</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(balance)}</p>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              €
            </span>
            <input
              inputMode="decimal"
              placeholder="Ex.: 20"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.,]/g, ""));
                setError("");
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-10 py-3 text-lg font-semibold text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 placeholder:text-gray-400"
            />
          </div>
          {parsed > balance && (
            <p className="text-xs text-red-500">Não podes reembolsar mais do que o saldo disponível.</p>
          )}

          {quickAmounts.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                    parsed === v
                      ? "border-gray-800 bg-gray-800 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100",
                  )}
                >
                  {v === balance ? "Tudo" : `€${v}`}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400">
            Só é possível reembolsar o valor que carregaste via cartão. Saldo ganho como
            condutor pode ser levantado via IBAN em "Pedir saque".
          </p>
        </div>
      )}
    </Sheet>
  );
}
