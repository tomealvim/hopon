import { useState } from "react";
import Sheet from "../components/ui/Sheet";
import { cn } from "../utils/cn";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS, TERMS_TITLE } from "../data/terms";

const ONBOARDING_STORAGE_KEY = "hopon_onboarding_completed";
export const LOCATION_PERMISSION_KEY = "hopon_location_permission"; // "granted" | "declined"

type OnboardingScreen = 1 | 2 | 3 | 4 | 5;

interface OnboardingPageProps {
  onComplete: (mode?: "register" | "login") => void;
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [currentScreen, setCurrentScreen] = useState<OnboardingScreen>(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const isFinalScreen = currentScreen === 5;
  const isLocationScreen = currentScreen === 4;

  const advance = () => {
    if (currentScreen < 5) {
      setCurrentScreen((prev) => (prev + 1) as OnboardingScreen);
    } else if (agreedToTerms) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      onComplete("login");
    }
  };

  const handleNext = () => {
    if (isLocationScreen) {
      localStorage.setItem(LOCATION_PERMISSION_KEY, "declined");
    }
    advance();
  };

  const handleBack = () => {
    if (currentScreen > 1) {
      setCurrentScreen((prev) => (prev - 1) as OnboardingScreen);
    }
  };

  const handleAllowLocation = () => {
    setLocationDenied(false);
    navigator.geolocation.getCurrentPosition(
      () => { localStorage.setItem(LOCATION_PERMISSION_KEY, "granted"); advance(); },
      (err) => {
        localStorage.setItem(LOCATION_PERMISSION_KEY, "declined");
        if (err.code === 1) { // PERMISSION_DENIED
          setLocationDenied(true);
        } else {
          advance();
        }
      },
      { timeout: 8000 },
    );
  };

  return (
    <div className="h-[100svh] overflow-hidden bg-[#F9FAF5] flex flex-col font-manrope text-[#1A1C19]"
      style={{ padding: "1.5rem 1.5rem calc(1rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        {currentScreen > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full border border-[#e7e9e4] flex items-center justify-center text-[#1B4332] hover:bg-[#f3f4ef] transition"
            aria-label="Voltar"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
        ) : (
          <span className="w-10 h-10" />
        )}
        <span className="font-noto-serif italic font-bold text-[#1B4332] text-lg">HopOn</span>
        <span className="text-sm font-medium text-[#717973]">{currentScreen}/5</span>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-start pt-4">
        {currentScreen === 1 && <Screen1 />}
        {currentScreen === 2 && <Screen2 />}
        {currentScreen === 3 && <Screen3 />}
        {currentScreen === 4 && <Screen4Location onAllow={handleAllowLocation} denied={locationDenied} onContinue={advance} />}
        {currentScreen === 5 && (
          <Screen5Terms
            agreedToTerms={agreedToTerms}
            onAgreeChange={setAgreedToTerms}
            onOpenTerms={() => setIsTermsOpen(true)}
            onLogin={() => {
              localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
              onComplete("login");
            }}
            termsTitle={TERMS_TITLE}
          />
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#e7e9e4] rounded-full mb-4 w-full max-w-md mx-auto">
        <div
          className="h-1 bg-[#52B788] rounded-full transition-all duration-300"
          style={{ width: `${(currentScreen / 5) * 100}%` }}
        />
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-end w-full max-w-md mx-auto">
        <button
          type="button"
          onClick={handleNext}
          disabled={isFinalScreen && !agreedToTerms}
          className={cn(
            "flex items-center justify-center gap-2 font-bold transition active:scale-95",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#52B788]",
            isFinalScreen
              ? "bg-[#52B788] text-white px-8 h-14 rounded-full text-sm shadow-lg shadow-[#52B788]/20"
              : isLocationScreen
                ? "bg-transparent text-[#717973] px-6 h-12 rounded-full text-sm"
                : "bg-[#1B4332] text-white px-6 h-14 rounded-full text-[15px] shadow-md"
          )}
          aria-label={isFinalScreen ? "Começar" : isLocationScreen ? "Agora não" : "Seguinte"}
        >
          {isFinalScreen ? (
            <>Começar <span className="material-symbols-outlined text-xl">arrow_forward</span></>
          ) : isLocationScreen ? (
            <span>Agora não</span>
          ) : (
            <>Seguinte <span className="material-symbols-outlined text-xl">arrow_forward</span></>
          )}
        </button>
      </div>

      {/* Terms sheet */}
      <Sheet open={isTermsOpen} onClose={() => setIsTermsOpen(false)} title={TERMS_TITLE} height="lg">
        <div id="onboarding-terms-sheet" className="space-y-6 text-sm text-[#414844]">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-2">
              <h4 className="text-base font-semibold text-[#1A1C19]">{section.title}</h4>
              <p className="leading-relaxed">{section.content}</p>
            </section>
          ))}
          <p className="text-xs text-[#717973]">
            Estes Termos e Condições são preliminares e serão validados juridicamente antes do
            lançamento público. Última atualização: {TERMS_LAST_UPDATED}.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

// ─── Ecrã 1: Boas-vindas com benefícios ──────────────────────────────────────
function Screen1() {
  const benefits = [
    { icon: "savings",        text: "Poupar dinheiro nas viagens" },
    { icon: "payments",       text: "Gerar rendimento passivo" },
    { icon: "group",          text: "Conhecer novas pessoas" },
    { icon: "traffic",        text: "Superar o congestionamento" },
  ];
  return (
    <div className="w-full max-w-sm mx-auto space-y-7 text-left">
      <div className="space-y-2.5">
        <p className="text-[11px] uppercase tracking-[0.55em] text-[#717973]">Ready to</p>
        <h1 className="text-[32px] leading-tight font-bold text-[#1B4332] font-noto-serif italic">
          HopOn
        </h1>
        <p className="text-[15px] text-[#414844]">
          Vamos viajar juntos e tornar cada boleia mais simples, segura e económica.
        </p>
      </div>
      <div className="space-y-3">
        {benefits.map((b) => (
          <div
            key={b.text}
            className="flex items-center gap-3 rounded-full bg-white border border-[#e7e9e4] px-4 py-3 shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-[#95D5B2]/25 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#006c48]" style={{ fontSize: "16px" }}>
                {b.icon}
              </span>
            </div>
            <span className="text-[15px] text-[#1A1C19] font-medium">{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ecrã 2: Encontrar uma boleia ─────────────────────────────────────────────
function Screen2() {
  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-[#95D5B2]/25 flex items-center justify-center mx-auto">
        <span
          className="material-symbols-outlined text-[#1B4332]"
          style={{ fontSize: "40px", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 40" }}
        >
          search
        </span>
      </div>
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.55em] text-[#717973]">Explorar</p>
        <h1 className="text-[28px] font-bold text-[#1B4332] leading-tight font-noto-serif italic">
          Encontrar uma boleia
        </h1>
        <p className="text-[14px] text-[#414844] leading-relaxed">
          Solicita uma boleia e sê recolhido no mesmo percurso pelo condutor. Sabes sempre quem te leva e quando.
        </p>
      </div>
    </div>
  );
}

// ─── Ecrã 3: Publicar uma boleia ──────────────────────────────────────────────
function Screen3() {
  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-[#95D5B2]/25 flex items-center justify-center mx-auto">
        <span
          className="material-symbols-outlined text-[#1B4332]"
          style={{ fontSize: "40px", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 40" }}
        >
          directions_car
        </span>
      </div>
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.55em] text-[#717973]">Partilhar</p>
        <h1 className="text-[28px] font-bold text-[#1B4332] leading-tight font-noto-serif italic">
          Publicar uma boleia
        </h1>
        <p className="text-[14px] text-[#414844] leading-relaxed">
          Publica uma boleia e recolhe passageiros pelo caminho. Decide o percurso e mantém o carro cheio.
        </p>
      </div>
    </div>
  );
}

// ─── Ecrã 4: Permissão de localização ─────────────────────────────────────────
function Screen4Location({ onAllow, denied, onContinue }: { onAllow: () => void; denied: boolean; onContinue: () => void }) {
  const benefits = [
    "Boleias ordenadas pela distância a ti",
    "Sugestões automáticas para o teu trajeto",
    "Alerta quando há boleia disponível perto",
  ];
  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-8">
      <div className="w-20 h-20 rounded-full bg-[#95D5B2]/25 flex items-center justify-center mx-auto shadow-[0_8px_32px_-4px_rgba(27,67,50,0.1)]">
        <span
          className="material-symbols-outlined text-[#1B4332]"
          style={{ fontSize: "40px", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 40" }}
        >
          location_on
        </span>
      </div>
      <div className="space-y-3">
        <h1 className="text-[26px] font-bold text-[#1B4332] leading-tight font-noto-serif italic">
          Boleias perto de ti
        </h1>
        <p className="text-[14px] text-[#414844] leading-relaxed">
          Para encontrares boleias na tua zona e receberes sugestões personalizadas, precisamos de saber onde estás.
        </p>
      </div>
      <div className="space-y-3 text-left">
        {benefits.map((text) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-2xl bg-white border border-[#e7e9e4] px-4 py-3"
          >
            <div className="w-6 h-6 rounded-full bg-[#52B788] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white" style={{ fontSize: "14px" }}>check</span>
            </div>
            <span className="text-sm text-[#1A1C19] font-medium">{text}</span>
          </div>
        ))}
      </div>
      {denied ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left">
            <span className="material-symbols-outlined text-amber-600 text-xl flex-shrink-0 mt-0.5">warning</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800">Localização bloqueada</p>
              <p className="text-xs text-amber-700">Para ativar: Definições do iPhone - Safari - Localização - Perguntar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="w-full h-12 rounded-full bg-[#edeee9] text-[#1B4332] font-bold text-[15px] transition active:scale-95"
          >
            Continuar sem localização
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAllow}
          className="w-full h-14 rounded-full bg-[#1B4332] text-white font-bold text-[15px] transition active:scale-95 shadow-lg shadow-[#1B4332]/20 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">my_location</span>
          Permitir localização
        </button>
      )}
    </div>
  );
}

// ─── Ecrã 5: Termos e condições ────────────────────────────────────────────────
function Screen5Terms({
  agreedToTerms,
  onAgreeChange,
  onOpenTerms,
  onLogin,
  termsTitle,
}: {
  agreedToTerms: boolean;
  onAgreeChange: (agreed: boolean) => void;
  onOpenTerms: () => void;
  onLogin: () => void;
  termsTitle: string;
}) {
  return (
    <div className="w-full text-center space-y-8 max-w-sm mx-auto">
      <div className="space-y-2">
        <h1 className="text-5xl font-bold text-[#1B4332] font-noto-serif italic">HopOn</h1>
        <p className="text-sm tracking-[0.4em] uppercase text-[#717973]">Vamos viajar juntos</p>
      </div>
      <p className="text-base text-[#414844] leading-relaxed px-2">
        Para começares a usar a partilha de boleias, por favor concorda com os nossos{" "}
        <button
          type="button"
          onClick={onOpenTerms}
          className="underline font-semibold text-[#1B4332] hover:text-[#006c48] transition"
        >
          {termsTitle}
        </button>
      </p>
      <label className="flex items-start gap-4 bg-white border border-[#e7e9e4] rounded-2xl p-5 cursor-pointer hover:bg-[#f3f4ef] transition text-left">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => onAgreeChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="mt-0.5 w-6 h-6 flex-shrink-0 rounded-lg border-2 border-[#D0E8DC] flex items-center justify-center transition-all peer-checked:bg-[#52B788] peer-checked:border-[#52B788]">
          {agreedToTerms && (
            <span className="material-symbols-outlined text-white" style={{ fontSize: "14px" }}>check</span>
          )}
        </span>
        <span className="text-sm text-[#414844] leading-relaxed">
          Concordo com os termos e condições da partilha de boleias e confirmo que os li com atenção.
        </span>
      </label>
      <p className="text-sm text-[#717973]">
        Já tens conta?{" "}
        <button
          type="button"
          onClick={onLogin}
          className="font-bold text-[#1B4332] underline underline-offset-2 decoration-[#52B788]/60"
        >
          Iniciar sessão
        </button>
      </p>
    </div>
  );
}

// ─── Helpers exportados ────────────────────────────────────────────────────────
export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  console.log("Onboarding resetado! Recarrega a página para ver o onboarding novamente.");
}

if (typeof window !== "undefined") {
  (window as any).resetOnboarding = resetOnboarding;
}
