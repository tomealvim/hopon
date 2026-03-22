import { useState } from "react";
import Sheet from "../components/ui/Sheet";
import AppName from "../components/ui/AppName";
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
  const isFinalScreen = currentScreen === 5;
  const isLocationScreen = currentScreen === 4;
  const isDark = false;

  const advance = () => {
    if (currentScreen < 5) {
      setCurrentScreen((prev) => (prev + 1) as OnboardingScreen);
    } else if (agreedToTerms) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      onComplete("register");
    }
  };

  const handleNext = () => {
    // No ecrã de localização, "Seguinte" age como "Agora não"
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
    navigator.geolocation.getCurrentPosition(
      () => { localStorage.setItem(LOCATION_PERMISSION_KEY, "granted"); advance(); },
      () => { localStorage.setItem(LOCATION_PERMISSION_KEY, "declined"); advance(); },
      { timeout: 8000 },
    );
  };

  return (
    <div
      className={cn(
        "min-h-[100svh] flex flex-col px-6 pt-6 pb-6 transition-colors duration-300 text-gray-900",
        "bg-white"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        {currentScreen > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              "min-w-[46px] h-11 rounded-full border flex items-center justify-center text-base font-semibold transition",
              isDark
                ? "border-white/20 text-white hover:bg-white/10"
                : "border-gray-200 text-gray-700 hover:bg-gray-100"
            )}
            aria-label="Voltar"
          >
            ←
          </button>
        ) : (
          <span className="min-w-[46px] h-11" />
        )}
        <div
          className={cn(
            "text-xs uppercase tracking-[0.4em] font-semibold",
            isDark ? "text-white/50" : "text-gray-400"
          )}
        >
          <AppName />
        </div>
        <div className={cn(
          "text-sm font-medium",
          isDark ? "text-white/60" : "text-gray-500"
        )}>
          {currentScreen}/5
        </div>
      </div>

      {/* Conteúdo principal */}
      <div
        className={cn(
          "flex-1 w-full max-w-md mx-auto flex flex-col",
          currentScreen === 1 ? "justify-end pb-10" : "justify-center gap-12 pb-12"
        )}
      >
        {currentScreen === 1 && <Screen1 />}
        {currentScreen === 2 && <Screen2 />}
        {currentScreen === 3 && <Screen3 />}
        {currentScreen === 4 && <Screen4Location onAllow={handleAllowLocation} />}
        {currentScreen === 5 && (
          <Screen5Terms
            agreedToTerms={agreedToTerms}
            onAgreeChange={setAgreedToTerms}
            onOpenTerms={() => setIsTermsOpen(true)}
            termsTitle={TERMS_TITLE}
          />
        )}
      </div>

      {/* Navegação inferior */}
      <div
        className="flex items-center justify-end"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={handleNext}
          disabled={isFinalScreen && !agreedToTerms}
          className={cn(
            "flex items-center justify-center font-semibold transition shadow-md",
            isFinalScreen
              ? "bg-gray-900 text-white px-8 h-14 rounded-full text-sm uppercase tracking-[0.15em]"
              : isLocationScreen
                ? "bg-transparent text-gray-400 px-6 h-12 rounded-full text-sm"
                : "bg-gray-900 text-white px-6 h-14 rounded-full text-[15px]",
            "active:scale-95",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 focus-visible:ring-offset-white"
          )}
          aria-label={isFinalScreen ? "Começar" : isLocationScreen ? "Agora não" : "Seguinte"}
        >
          {isFinalScreen ? (
            <span className="flex items-center gap-2">
              Começar
              <span className="text-xl leading-none">→</span>
            </span>
          ) : isLocationScreen ? (
            <span>Agora não</span>
          ) : (
            <span>Seguinte →</span>
          )}
        </button>
      </div>

      <Sheet
        open={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        title={TERMS_TITLE}
        height="lg"
      >
        <div id="onboarding-terms-sheet" className="space-y-6 text-sm text-gray-700">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-2">
              <h4 className="text-base font-semibold text-gray-900">{section.title}</h4>
              <p className="leading-relaxed text-gray-600">{section.content}</p>
            </section>
          ))}
          <p className="text-xs text-gray-500">
            Estes Termos e Condições são preliminares e serão validados juridicamente antes do
            lançamento público. Última atualização: {TERMS_LAST_UPDATED}.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

// Ecrã 1: "Vamos viajar juntos"
function Screen1() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-7 text-left">
      <div className="space-y-2.5">
        <p className="text-[11px] uppercase tracking-[0.55em] text-gray-500">Ready to</p>
        <h1 className="text-[32px] leading-tight font-bold text-gray-900">
          <AppName className="tracking-[0.08em]" />
        </h1>
        <p className="text-[15px] text-gray-600">
          Vamos viajar juntos e tornar cada boleia mais simples, segura e económica.
        </p>
      </div>
      <div className="space-y-3.5">
        <BenefitItem text="Poupar dinheiro nas viagens" />
        <BenefitItem text="Gerar rendimento passivo" />
        <BenefitItem text="Conhecer novas pessoas" />
        <BenefitItem text="Superar o congestionamento" />
      </div>
    </div>
  );
}

// Ecrã 2: "Encontrar uma boleia"
function Screen2() {
  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-6">
      <div className="space-y-3.5">
        <p className="text-[11px] uppercase tracking-[0.55em] text-gray-500">Explorar</p>
        <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Encontrar uma boleia</h1>
        <p className="text-[14px] text-gray-600">
          Solicita uma boleia e sê recolhido no mesmo percurso pelo condutor. Sabe quem te leva e quando.
        </p>
      </div>
    </div>
  );
}

// Ecrã 3: "Publicar uma boleia"
function Screen3() {
  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-6">
      <div className="space-y-3.5">
        <p className="text-[11px] uppercase tracking-[0.55em] text-gray-500">Partilhar</p>
        <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Publicar uma boleia</h1>
        <p className="text-[14px] text-gray-600">
          Publica uma boleia e recolhe passageiros pelo caminho. Decide o percurso e mantém o carro cheio.
        </p>
      </div>
    </div>
  );
}

// Ecrã 4: Permissão de localização
function Screen4Location({ onAllow }: { onAllow: () => void }) {
  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-8">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mx-auto">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      </div>
      <div className="space-y-3">
        <h1 className="text-[26px] font-bold text-gray-900 leading-tight">Boleias perto de ti</h1>
        <p className="text-[14px] text-gray-600 leading-relaxed">
          Para encontrares boleias na tua zona e receberes sugestoes personalizadas, precisamos de saber onde estas.
        </p>
      </div>
      <div className="space-y-3 text-left">
        <LocationBenefit text="Boleias ordenadas pela distancia a ti" />
        <LocationBenefit text="Sugestoes automaticas para o teu trajeto" />
        <LocationBenefit text="Alerta quando ha boleia disponivel agora perto" />
      </div>
      <button
        type="button"
        onClick={onAllow}
        className="w-full h-14 rounded-full bg-gray-900 text-white font-semibold text-[15px] transition active:scale-95 shadow-md"
      >
        Permitir localizacao
      </button>
    </div>
  );
}

function LocationBenefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
      <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <span className="text-sm text-gray-800">{text}</span>
    </div>
  );
}

// Ecrã 5: Termos e condições
function Screen5Terms({
  agreedToTerms,
  onAgreeChange,
  onOpenTerms,
  termsTitle,
}: {
  agreedToTerms: boolean;
  onAgreeChange: (agreed: boolean) => void;
  onOpenTerms: () => void;
  termsTitle: string;
}) {
  return (
    <div className="w-full text-center space-y-10">
      <div className="space-y-2">
        <AppName className="text-4xl md:text-5xl font-bold text-gray-900" />
        <p className="text-sm tracking-[0.4em] uppercase text-gray-500">Vamos viajar juntos</p>
      </div>
      <p className="text-base text-gray-700 leading-relaxed px-2">
        Para começares a usar a partilha de boleias, por favor concorda primeiro com os nossos{" "}
        <button
          type="button"
          onClick={onOpenTerms}
          aria-haspopup="dialog"
          aria-controls="onboarding-terms-sheet"
          className="underline font-semibold hover:text-gray-900 transition"
        >
          {termsTitle}
        </button>
      </p>
      <label className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-3xl p-5 cursor-pointer hover:bg-gray-100 transition text-left">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => onAgreeChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="mt-1 w-6 h-6 rounded-lg border border-gray-300 flex items-center justify-center text-xs font-black text-transparent peer-checked:bg-gray-900 peer-checked:text-white transition">
          ✓
        </span>
        <span className="text-sm text-gray-700 leading-relaxed">
          Concordo com os termos e condições da partilha de boleias e confirmo que os li com atenção.
        </span>
      </label>
    </div>
  );
}

// Componente auxiliar para os benefícios
function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-gray-50 border border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-900 text-white">
        ✓
      </div>
      <span className="text-base text-gray-900 font-medium">{text}</span>
    </div>
  );
}

// Função helper para verificar se o onboarding foi completado
export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

// Função helper para resetar o onboarding (útil para desenvolvimento)
export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  console.log("✅ Onboarding resetado! Recarrega a página para ver o onboarding novamente.");
}

// Expor globalmente para uso via console do browser (apenas em desenvolvimento)
if (typeof window !== "undefined") {
  (window as any).resetOnboarding = resetOnboarding;
}

