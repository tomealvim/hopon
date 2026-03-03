import { useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { apiRequest } from "../../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  rideLabel: string;
  onSubmitted?: () => void;
};

const REASONS: { value: string; label: string }[] = [
  { value: "WRONG_AMOUNT",    label: "Valor cobrado errado" },
  { value: "NO_SHOW",         label: "Condutor não apareceu" },
  { value: "SAFETY",          label: "Problema de segurança" },
  { value: "SERVICE_QUALITY", label: "Qualidade do serviço" },
  { value: "OTHER",           label: "Outro motivo" },
];

export default function DisputeSheet({ open, onClose, bookingId, rideLabel, onSubmitted }: Props) {
  const [reason, setReason]           = useState(REASONS[0].value);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [done, setDone]               = useState(false);

  async function handleSubmit() {
    if (description.trim().length < 10) {
      setError("Descreve o problema com pelo menos 10 caracteres.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiRequest("/disputes", {
        method: "POST",
        body: JSON.stringify({ bookingId, reason, description: description.trim() }),
      });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao submeter disputa.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setReason(REASONS[0].value);
    setDescription("");
    setError("");
    setDone(false);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Contestar boleia"
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
                disabled={submitting || description.trim().length < 10}
                onClick={handleSubmit}
              >
                {submitting ? "A enviar…" : "Submeter disputa"}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-6">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">Disputa submetida</p>
            <p className="text-sm text-gray-500">
              A equipa HopOn irá analisar a situação e notificar-te quando houver uma resolução.
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">Boleia</p>
              <p className="text-sm font-semibold text-gray-900">{rideLabel}</p>
            </section>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-600">Motivo</p>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm transition",
                      reason === r.value
                        ? "border-gray-800 bg-gray-100 font-semibold text-gray-900"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="dispute-desc" className="text-xs font-semibold uppercase text-gray-600">
                Descrição
              </label>
              <textarea
                id="dispute-desc"
                rows={4}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setError(""); }}
                placeholder="Descreve o que aconteceu com detalhe…"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{description.trim().length}/10 mín.</p>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
