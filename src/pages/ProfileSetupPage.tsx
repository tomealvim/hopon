import { useEffect, useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import type { UserProfile, UserSchedule } from "./types/user";
import ScheduleEditor from "../components/ui/ScheduleEditor";
import ImageUpload from "../components/ui/ImageUpload";
import Sheet from "../components/ui/Sheet";
import AppName from "../components/ui/AppName";

type Step = 1 | 2 | 3;

const STEP_META: Record<Step, { eyebrow: string; title: string; subtitle: string }> = {
  1: {
    eyebrow: "Identidade",
    title: "Apresenta-te com confiança",
    subtitle: "Foto, nome e apelido público visíveis nas boleias.",
  },
  2: {
    eyebrow: "Contactos & Casa",
    title: "Mantém-nos por perto",
    subtitle: "Telemóvel, email opcional e morada principal para sugestões rápidas.",
  },
  3: {
    eyebrow: "Horários",
    title: "Qual é o teu ritmo?",
    subtitle: "Adiciona compromissos para sugerirmos boleias que encaixam no teu dia.",
  },
};

export default function ProfileSetupPage() {
  const { updateProfile, user } = useAuth();
  const { showError } = useNotifications();
  const [step, setStep] = useState<Step>(1);

  // Step 1: Dados pessoais
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);

  // Step 2: Contactos e morada
  const [address, setAddress] = useState("");
  const accountEmail = user?.email ?? "";

  useEffect(() => {
    setContactEmail((prev) => prev || accountEmail);
  }, [accountEmail]);

  // Step 3: Horário
  const [schedule, setSchedule] = useState<UserSchedule>({ days: [] });

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      showError("Campo obrigatório", "Indica o teu nome completo.");
      return;
    }
    if (step === 2 && (!phone.trim() || !address.trim())) {
      showError("Campos obrigatórios", "Telemóvel e morada são necessários.");
      return;
    }
    if (step < 3) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleFinish = () => {
    if (schedule.days.length === 0) {
      showError("Horário necessário", "Por favor, adiciona pelo menos um horário");
      return;
    }

    const profile: UserProfile = {
      name: name.trim(),
      username: username.trim() || undefined,
      phone: phone.trim(),
      contactEmail: contactEmail.trim() || undefined,
      avatarUrl: avatarUrl || undefined,
      address: address.trim(),
      schedule,
      createdAt: new Date().toISOString(),
    };

    updateProfile(profile);
  };


  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-10 w-96 h-96 bg-pink-500/20 blur-[160px]" />
        <div className="absolute top-10 right-0 w-72 h-72 bg-purple-500/20 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] bg-amber-300/10 blur-[200px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-6 flex flex-col items-center text-center gap-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">{STEP_META[step].eyebrow}</p>
          <AppName className="text-4xl font-black text-white" />
          <p className="text-sm text-white/75">{STEP_META[step].subtitle}</p>
        </div>

        <StepCard>
          {step === 1 && (
            <div className="grid gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className="w-24 h-24 rounded-full bg-gray-900 text-white flex items-center justify-center text-3xl font-bold overflow-hidden cursor-pointer border-4 border-white shadow-[0_12px_25px_rgba(0,0,0,0.25)]"
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
                <TextField
                  id="username"
                  label="Username / apelido público"
                  placeholder="Ex: joaosilva"
                  hint="Ajuda-te a partilhar o perfil com um @apelido."
                  value={username}
                  onChange={setUsername}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 text-left">
              <TextField
                id="phone"
                type="tel"
                label="Telemóvel *"
                placeholder="Ex: +351 912 345 678"
                hint="Usado para confirmações e alertas importantes."
                value={phone}
                onChange={setPhone}
                autoFocus
              />
              <TextField
                id="contactEmail"
                type="email"
                label="Email preferencial"
                placeholder="Ex: joao@exemplo.com"
                hint="Opcional — recebidos, suporte e alertas podem ir para aqui."
                value={contactEmail}
                onChange={setContactEmail}
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

          {step === 3 && (
            <div className="grid gap-4 text-left">
              <div className="text-gray-700">
                <p className="font-semibold mb-2">Agenda semanal</p>
                <p className="text-sm text-gray-500">
                  Adiciona os blocos de aulas para recomendações mais certeiras.
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-3">
                <ScheduleEditor schedule={schedule} onChange={setSchedule} />
              </div>
            </div>
          )}
        </StepCard>

        <div className="flex flex-col md:flex-row gap-3 w-full pt-2">
          {step > 1 && (
            <SecondaryActionButton onClick={handleBack}>
              Voltar
            </SecondaryActionButton>
          )}
          {step < 3 ? (
            <PrimaryActionButton onClick={handleNext}>
              Continuar
            </PrimaryActionButton>
          ) : (
            <PrimaryActionButton onClick={handleFinish}>
              Concluir
            </PrimaryActionButton>
          )}
        </div>

        <span className="inline-flex items-center justify-center px-4 py-1 rounded-full border border-white/20 text-[11px] font-semibold text-white/80">
          Passo {step} / 3
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
      className="w-full md:flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black font-semibold shadow-[0_20px_45px_rgba(255,113,154,0.35)] transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF719A] focus-visible:ring-offset-black"
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
      className="w-full md:flex-1 h-12 rounded-2xl border border-white/30 text-white font-semibold transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white focus-visible:ring-offset-black"
      {...rest}
    >
      {children}
    </button>
  );
}

