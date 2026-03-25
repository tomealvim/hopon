import { useState } from "react";
import Sheet from "./Sheet";
import { Button } from "./Button";
import { apiRequest } from "../../services/api";
import { useNotifications } from "../../contexts/NotificationContext";

const REPORT_REASONS = [
  { value: "INAPPROPRIATE_BEHAVIOR", label: "Comportamento inadequado" },
  { value: "NO_SHOW", label: "Não apareceu" },
  { value: "FRAUD", label: "Fraude" },
  { value: "HARASSMENT", label: "Assédio" },
  { value: "OTHER", label: "Outro" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetName?: string;
};

export default function ReportSheet({ open, onClose, targetId, targetName }: Props) {
  const { showSuccess, showError } = useNotifications();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setLoading(true);
    try {
      await apiRequest("/reports", {
        method: "POST",
        body: JSON.stringify({ targetId, reason, details: details.trim() || undefined }),
      });
      showSuccess("Denúncia enviada", "A equipa do HopOn vai analisar em breve.");
      setReason("");
      setDetails("");
      onClose();
    } catch (err) {
      showError("Erro ao enviar", err instanceof Error ? err.message : "Tenta novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Denunciar utilizador"
      height="md"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!reason || loading}
          >
            {loading ? "A enviar..." : "Enviar denúncia"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 p-1">
        {targetName && (
          <p className="text-sm text-[#414844]">
            Denunciar: <span className="font-semibold">{targetName}</span>
          </p>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-2">Motivo</label>
          <div className="grid gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  reason === r.value
                    ? "border-red-400 bg-red-50 text-red-800 font-medium"
                    : "border-[#e7e9e4] bg-white text-[#414844] hover:border-[#c1c8c2]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">
            Detalhes (opcional)
          </label>
          <textarea
            className="w-full px-3 py-2.5 border border-[#e7e9e4] rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none text-sm"
            rows={3}
            placeholder="Descreve o que aconteceu..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
          />
        </div>
      </div>
    </Sheet>
  );
}
