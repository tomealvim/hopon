import { useEffect, useMemo, useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";

type VerificationChannel = "email" | "phone";

type VerificationSheetProps = {
  open: boolean;
  channel: VerificationChannel | null;
  value?: string;
  onClose: () => void;
  onVerified: () => void;
};

export default function VerificationSheet({
  open,
  channel,
  value,
  onClose,
  onVerified,
}: VerificationSheetProps) {
  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: number | undefined;
    if (cooldown > 0) {
      timer = window.setTimeout(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [cooldown]);

  useEffect(() => {
    if (!open) {
      setCode("");
      setSentCode(null);
      setAttemptError(null);
      setCooldown(0);
      setIsSending(false);
    }
  }, [open]);

  const channelLabel = useMemo(() => (channel === "phone" ? "telemóvel" : "email"), [channel]);

  const handleSendCode = async () => {
    if (!value || !channel) return;
    setIsSending(true);
    setAttemptError(null);
    await new Promise(resolve => setTimeout(resolve, 600));
    const generated = Math.random().toString(36).slice(-6).toUpperCase();
    setSentCode(generated);
    setCooldown(30);
    setIsSending(false);
  };

  const handleVerify = () => {
    if (!sentCode) {
      setAttemptError("Envia primeiro o código.");
      return;
    }
    if (code.trim().toUpperCase() !== sentCode) {
      setAttemptError("Código incorreto. Tenta novamente.");
      return;
    }
    onVerified();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={channel ? `Verificar ${channel === "phone" ? "telemóvel" : "email"}` : "Verificação"}
      height="md"
      footer={
        <Button block className="min-h-[48px]" onClick={handleVerify} disabled={!code}>
          Confirmar verificação
        </Button>
      }
    >
      {!channel ? (
        <p className="text-sm text-white/60">Seleciona um contacto para verificar.</p>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Contacto</p>
            <p className="text-base font-semibold text-white">{value}</p>
            <p className="text-xs text-white/60 mt-1">
              Vamos enviar um código para este {channelLabel}. Introduz o código para concluir a verificação.
            </p>
          </div>

          <div className="grid gap-2">
            <Button
              variant="secondary"
              type="button"
              disabled={isSending || cooldown > 0 || !value}
              onClick={handleSendCode}
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : sentCode ? "Reenviar código" : "Enviar código"}
            </Button>
            {sentCode && (
              <p className="text-xs text-white/60 text-center">
                Código enviado (demo): <span className="font-mono text-white">{sentCode}</span>
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <label htmlFor="verification-code" className="text-xs font-semibold text-white/80 uppercase tracking-wide">
              Código de 6 caracteres
            </label>
            <input
              id="verification-code"
              maxLength={6}
              value={code}
              onChange={event => {
                setCode(event.target.value.toUpperCase());
                setAttemptError(null);
              }}
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-center text-lg font-mono tracking-[0.5em] text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••"
            />
            {attemptError && <p className="text-xs text-red-400">{attemptError}</p>}
          </div>
        </div>
      )}
    </Sheet>
  );
}

