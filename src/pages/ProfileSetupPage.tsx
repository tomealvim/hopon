import { useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import type { UserProfile } from "./types/user";
import ImageUpload from "../components/ui/ImageUpload";
import Sheet from "../components/ui/Sheet";
import AppName from "../components/ui/AppName";

type Step = 1 | 2;

const STEP_META: Record<Step, { eyebrow: string; title: string; subtitle: string }> = {
  1: {
    eyebrow: "Identidade",
    title: "Apresenta-te com confiança",
    subtitle: "Foto e nome visíveis nas boleias.",
  },
  2: {
    eyebrow: "Contactos & Casa",
    title: "Mantém-nos por perto",
    subtitle: "Telemóvel, username e morada principal para sugestões rápidas.",
  },
};

export default function ProfileSetupPage() {
  const { updateProfile } = useAuth();
  const { showError } = useNotifications();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Step 1: Dados pessoais
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);

  // Step 2: Contactos e morada
  const [phone, setPhone] = useState<string>("");
  const [country, setCountry] = useState<Country>("PT");
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      showError("Campo obrigatório", "Indica o teu nome completo.");
      return;
    }
    if (step < 2) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleFinish = async () => {
    if (!phone.trim() || !address.trim()) {
      showError("Campos obrigatórios", "Telemóvel e morada são necessários.");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const profile: Partial<UserProfile> = {
        name: name.trim(),
        username: username.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        address: address.trim(),
        createdAt: new Date().toISOString(),
      };

      await updateProfile({
        ...profile,
        phone: phone.trim(),
        setupCompleted: true,
      });
    } catch (err: any) {
      const msg = err?.message ?? "Erro ao guardar perfil. Tenta novamente.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-10 w-96 h-96 bg-gray-300/10 blur-[160px]" />
        <div className="absolute top-10 right-0 w-72 h-72 bg-gray-300/8 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] bg-gray-200/5 blur-[200px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-6 flex flex-col items-center text-center gap-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.5em] text-gray-500">{STEP_META[step].eyebrow}</p>
          <AppName className="text-4xl font-black text-gray-900" />
          <p className="text-sm text-gray-600">{STEP_META[step].subtitle}</p>
        </div>

        <StepCard>
          {step === 1 && (
            <div className="grid gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className="w-24 h-24 rounded-full bg-gray-900 text-white flex items-center justify-center text-3xl font-bold overflow-hidden cursor-pointer border-4 border-gray-200 shadow-lg"
                  onClick={() => setShowAvatarSheet(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setShowAvatarSheet(true);
                    }
                  }}
                  aria-label="Adicionar foto de perfil"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{name ? name.charAt(0).toUpperCase() : "?"}</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  Clica para {avatarUrl ? "alterar" : "adicionar"} foto
                </p>
              </div>

              <div className="grid gap-4 text-left">
                <TextField
                  id="name"
                  label="Nome completo *"
                  placeholder="Ex: João Silva"
                  hint="Mostra-se em boleias, chats e pedidos."
                  value={name}
                  onChange={setName}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 text-left">
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Telemóvel *
                </label>
                <PhoneInput
                  international
                  defaultCountry={country}
                  country={country}
                  onCountryChange={(c) => c && setCountry(c)}
                  value={phone}
                  onChange={(val) => setPhone(val ?? "")}
                  className="phone-input-wrapper"
                />
                <p className="text-[11px] text-gray-500">
                  Seleciona o teu país e escreve o número — formatado automaticamente.
                </p>
              </div>
              <TextField
                id="username"
                label="Username / apelido público"
                placeholder="Ex: joaosilva"
                hint="Opcional — ajuda-te a partilhar o perfil com um @apelido."
                value={username}
                onChange={setUsername}
              />
              <TextField
                id="address"
                label="Morada principal *"
                placeholder="Ex: Amadora, Quinta da Fonte"
                hint='Guardamos como atalho "Casa" e sugerimos partidas mais rápidas.'
                value={address}
                onChange={setAddress}
              />
            </div>
          )}

        </StepCard>

        {saveError && (
          <div className="w-full rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {saveError}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 w-full pt-2">
          {step > 1 && (
            <SecondaryActionButton onClick={handleBack} disabled={saving}>
              Voltar
            </SecondaryActionButton>
          )}
          {step < 2 ? (
            <PrimaryActionButton onClick={handleNext}>
              Continuar
            </PrimaryActionButton>
          ) : (
            <PrimaryActionButton onClick={handleFinish} disabled={saving}>
              {saving ? "A guardar…" : "Concluir"}
            </PrimaryActionButton>
          )}
        </div>

        <span className="inline-flex items-center justify-center px-4 py-1 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600">
          Passo {step} / 2
        </span>
      </div>

      <Sheet
        open={showAvatarSheet}
        onClose={() => setShowAvatarSheet(false)}
        title="Foto de perfil"
      >
        <ImageUpload
          onImageSelected={(url) => {
            setAvatarUrl(url);
            setShowAvatarSheet(false);
          }}
        />
      </Sheet>
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full bg-white/95 text-gray-900 rounded-[28px] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.30)]">
      {children}
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  hint?: string;
};

function TextField({
  id,
  label,
  value,
  type = "text",
  placeholder,
  onChange,
  autoFocus,
  hint,
}: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        aria-describedby={hintId}
        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
      />
      {hint && (
        <p id={hintId} className="text-[11px] text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function PrimaryActionButton({
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="w-full md:flex-1 h-12 rounded-2xl bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end text-gray-900 font-semibold shadow-[0_8px_24px_rgba(180,120,120,0.2)] transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gradient-end focus-visible:ring-offset-white"
      {...rest}
    >
      {children}
    </button>
  );
}

function SecondaryActionButton({
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="w-full md:flex-1 h-12 rounded-2xl border border-gray-300 text-gray-800 font-semibold transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 focus-visible:ring-offset-white"
      {...rest}
    >
      {children}
    </button>
  );
}

