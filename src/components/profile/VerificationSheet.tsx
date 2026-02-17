import { useEffect, useMemo, useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";

type VerificationChannel = "email" | "phone";

type VerificationSheetProps = {
  open: boolean;
  channel: VerificationChannel | null;
  value?: string;
  onClose: () => void;
  onVerified: () => void;
};

const COOLDOWN_SECONDS = 60;

export default function VerificationSheet({
  open,
  channel,
  value,
  onClose,
  onVerified,
}: VerificationSheetProps) {
  const { sendOtp, verifyOtp } = useAuth();
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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
      setCodeSent(false);
      setAttemptError(null);
      setCooldown(0);
      setIsSending(false);
      setIsVerifying(false);
    }
  }, [open]);

  const channelLabel = useMemo(() => (channel === "phone" ? "telemóvel" : "email"), [channel]);

  const handleSendCode = async () => {
    if (!channel) return;
    setIsSending(true);
    setAttemptError(null);
    try {
      await sendOtp(channel);
      setCodeSent(true);
      setCooldown(COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Erro ao enviar código.";
      setAttemptError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!channel) return;
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setAttemptError("Introduz o código de 6 dígitos.");
      return;
    }
    setIsVerifying(true);
    setAttemptError(null);
    try {
      await verifyOtp(channel, trimmed);
      onVerified();
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Código incorreto. Tenta novamente.";
      setAttemptError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={channel ? `Verificar ${channel === "phone" ? "telemóvel" : "email"}` : "Verificação"}
      height="md"
      footer={
        <Button block className="min-h-[48px]" onClick={handleVerify} disabled={!code.trim() || isVerifying}>
          {isVerifying ? "A verificar…" : "Confirmar verificação"}
        </Button>
      }
    >
      {!channel ? (
        <p className="text-sm text-gray-600">Seleciona um contacto para verificar.</p>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contacto</p>
            <p className="text-base font-semibold text-gray-900 break-all">{value}</p>
            <p className="text-xs text-gray-600 mt-1">
              Vamos enviar um código para este {channelLabel}. Introduz o código abaixo para concluir a verificação.
            </p>
          </div>

          <div className="grid gap-2">
            <Button
              variant="secondary"
              type="button"
              disabled={isSending || cooldown > 0 || !value}
              onClick={handleSendCode}
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : codeSent ? "Reenviar código" : "Enviar código"}
            </Button>
            {codeSent && (
              <p className="text-xs text-gray-600 text-center">
                Código enviado. Verifica o teu {channelLabel}.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <label htmlFor="verification-code" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Código de 6 caracteres
            </label>
            <input
              id="verification-code"
              maxLength={6}
              value={code}
              onChange={event => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setAttemptError(null);
              }}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-lg font-mono tracking-[0.5em] text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              placeholder="••••••"
            />
            {attemptError && <p className="text-xs text-red-600">{attemptError}</p>}
          </div>
        </div>
      )}
    </Sheet>
  );
}

