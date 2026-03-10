import { useRef, useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  currentStatus: string | null | undefined;
  adminNote?: string | null;
  onUploaded?: () => void;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  NONE:     { label: "Não enviada",        color: "text-gray-500",    description: "Ainda não enviaste a tua carta de condução." },
  PENDING:  { label: "Em análise",         color: "text-amber-600",   description: "A tua carta está a ser verificada pela equipa HopOn. Pode demorar até 24h." },
  APPROVED: { label: "Verificada",         color: "text-emerald-600", description: "A tua carta de condução foi verificada. Podes adicionar veículos e oferecer boleias." },
  REJECTED: { label: "Documento rejeitado",color: "text-red-600",     description: "A carta enviada foi rejeitada. Envia um documento válido e legível." },
};

export default function DriverLicenseSheet({ open, onClose, currentStatus, adminNote, onUploaded }: Props) {
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [ccNumber, setCcNumber]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const status = currentStatus ?? "NONE";
  const statusInfo = STATUS_CONFIG[status] ?? STATUS_CONFIG.NONE;
  const canUpload = status === "NONE" || status === "REJECTED";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("O ficheiro é demasiado grande (máx 10MB)."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  async function handleUpload() {
    if (!file) { setError("Seleciona uma foto da carta de condução."); return; }
    if (!ccNumber.trim() || ccNumber.trim().length < 4) { setError("Introduz o número do Cartão de Cidadão (visível na carta)."); return; }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("document", file);

      const token = localStorage.getItem("accessToken");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
      const res = await fetch(`${API_URL}/auth/me/driver-license?ccNumber=${encodeURIComponent(ccNumber.trim())}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Erro ao enviar documento.");
      }
      setDone(true);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar documento.");
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setPreview(null);
    setCcNumber("");
    setError("");
    setDone(false);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Carta de condução"
      height="lg"
      footer={
        done || !canUpload ? (
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
                disabled={!file || uploading}
                onClick={handleUpload}
              >
                {uploading ? "A enviar…" : "Enviar carta"}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-6">

        {/* Estado atual */}
        <section className={cn(
          "rounded-2xl border px-4 py-3",
          status === "NONE" && "border-gray-200 bg-gray-50",
          status === "PENDING" && "border-amber-200 bg-amber-50",
          status === "APPROVED" && "border-emerald-200 bg-emerald-50",
          status === "REJECTED" && "border-red-200 bg-red-50",
        )}>
          <p className={cn("text-sm font-semibold", statusInfo.color)}>{statusInfo.label}</p>
          <p className="text-sm text-gray-600 mt-0.5">{statusInfo.description}</p>
          {status === "REJECTED" && adminNote && (
            <p className="text-xs text-red-500 mt-1">Motivo: {adminNote}</p>
          )}
        </section>

        {/* O que vamos fazer com isto */}
        {canUpload && !done && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Porque pedimos a carta de condução?</p>
            <p>Confirmar que es condutor habilitado e cruzar a tua identidade com o numero de CC visivel na carta - impede que alguem use documentos de outra pessoa.</p>
          </section>
        )}

        {done && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">Carta enviada</p>
            <p className="text-sm text-gray-500">A equipa HopOn irá verificar o documento em breve (ate 24h).</p>
          </div>
        )}

        {!done && canUpload && (
          <>
            {/* Campo CC */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-600">Numero do Cartao de Cidadao</p>
              <p className="text-xs text-gray-500">Deve estar visivel na tua carta de conducao. Serve para cruzar identidades.</p>
              <input
                type="text"
                value={ccNumber}
                onChange={e => { setCcNumber(e.target.value); setError(""); }}
                placeholder="Ex: 12345678 9 ZX4"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-600">Foto da carta de conducao</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center hover:border-gray-300 hover:bg-gray-100 transition"
              >
                {preview ? (
                  <img src={preview} alt="preview" className="mx-auto max-h-40 rounded-xl object-contain" />
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-700">Clica para selecionar</p>
                    <p className="text-xs text-gray-500">JPEG, PNG ou WebP · max 10MB</p>
                  </div>
                )}
              </button>
              {preview && (
                <button
                  type="button"
                  className="text-xs text-gray-500 underline"
                  onClick={() => { setFile(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
                >
                  Remover
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              A carta e processada de forma segura e utilizada apenas para verificacao de conducao. Nunca e partilhada com outros utilizadores.
            </p>
          </>
        )}

      </div>
    </Sheet>
  );
}
