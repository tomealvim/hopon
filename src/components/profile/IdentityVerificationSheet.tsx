import { useRef, useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { apiRequest } from "../../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  currentStatus: string | null | undefined;
  onUploaded?: () => void;
};

type DocType = "cc" | "passport" | "driving_license";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  cc: "Cartão de Cidadão",
  passport: "Passaporte",
  driving_license: "Carta de Condução",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  NONE:     { label: "Não verificado",     color: "text-gray-500",   description: "Ainda não enviaste nenhum documento." },
  PENDING:  { label: "Em análise",         color: "text-amber-600",  description: "O teu documento está a ser analisado pela equipa HopOn. Podes demorar até 24h." },
  VERIFIED: { label: "Verificado",         color: "text-emerald-600",description: "A tua identidade foi verificada com sucesso." },
  REJECTED: { label: "Documento rejeitado",color: "text-red-600",    description: "O documento enviado foi rejeitado. Envia um documento válido e legível." },
};

export default function IdentityVerificationSheet({ open, onClose, currentStatus, onUploaded }: Props) {
  const [docType, setDocType]       = useState<DocType>("cc");
  const [file, setFile]             = useState<File | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState("");
  const [done, setDone]             = useState(false);
  const inputRef                    = useRef<HTMLInputElement>(null);

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
    if (!file) { setError("Seleciona um ficheiro."); return; }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("document", file);

      const token = localStorage.getItem("accessToken");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
      const res = await fetch(`${API_URL}/auth/me/identity-document?type=${docType}`, {
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
    setError("");
    setDone(false);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Verificação de identidade"
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
                {uploading ? "A enviar…" : "Enviar documento"}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="space-y-6">

        {/* Estado atual */}
        <section className={cn("rounded-2xl border px-4 py-3", {
          "border-gray-200 bg-gray-50": status === "NONE",
          "border-amber-200 bg-amber-50": status === "PENDING",
          "border-emerald-200 bg-emerald-50": status === "VERIFIED",
          "border-red-200 bg-red-50": status === "REJECTED",
        })}>
          <p className={cn("text-sm font-semibold", statusInfo.color)}>{statusInfo.label}</p>
          <p className="text-sm text-gray-600 mt-0.5">{statusInfo.description}</p>
        </section>

        {done && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">Documento enviado</p>
            <p className="text-sm text-gray-500">A equipa HopOn irá verificar o documento em breve.</p>
          </div>
        )}

        {!done && canUpload && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-600">Tipo de documento</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocType(type)}
                    className={cn(
                      "rounded-2xl border px-2 py-2 text-xs font-semibold transition text-center",
                      docType === type
                        ? "border-gray-800 bg-gray-800 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100",
                    )}
                  >
                    {DOC_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-600">Foto do documento</p>
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
                    <p className="text-xs text-gray-500">JPEG, PNG ou WebP · máx 10MB</p>
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
              O documento é processado de forma segura e apenas utilizado para verificação de identidade.
              Nunca é partilhado com outros utilizadores.
            </p>
          </>
        )}

      </div>
    </Sheet>
  );
}
