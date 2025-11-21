import { useState } from "react";
import Sheet from "../components/ui/Sheet";
import AppName from "../components/ui/AppName";
import { cn } from "../utils/cn";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS, TERMS_TITLE } from "../data/terms";

const ONBOARDING_STORAGE_KEY = "hopon_onboarding_completed";

type OnboardingScreen = 1 | 2 | 3 | 4;

interface OnboardingPageProps {
  onComplete: () => void;
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [currentScreen, setCurrentScreen] = useState<OnboardingScreen>(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const isFinalScreen = currentScreen === 4;
  const isDark = true;

  const handleNext = () => {
    if (currentScreen < 4) {
      setCurrentScreen((prev) => (prev + 1) as OnboardingScreen);
    } else if (agreedToTerms) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentScreen > 1) {
      setCurrentScreen((prev) => (prev - 1) as OnboardingScreen);
    }
  };

  return (
    <div
      className={cn(
        "min-h-[100svh] flex flex-col px-6 pt-6 pb-6 transition-colors duration-300 text-white",
        "bg-gradient-to-b from-[#0a0611] via-[#1b0b24] to-[#050308]"
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
          {currentScreen}/4
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
        {currentScreen === 4 && (
          <Screen4
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
            "flex items-center justify-center font-semibold text-white transition shadow-[0_25px_40px_rgba(224,113,165,0.45)]",
            "bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A]",
            isFinalScreen ? "px-8 h-14 rounded-full text-sm uppercase tracking-[0.15em]" : "w-16 h-16 rounded-full",
            "active:scale-95",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF719A] focus-visible:ring-offset-black"
          )}
          aria-label={isFinalScreen ? "Começar" : "Seguinte"}
        >
          {isFinalScreen ? (
            <span className="flex items-center gap-2">
              Começar
              <span className="text-2xl leading-none">→</span>
            </span>
          ) : (
            <span className="text-2xl font-bold leading-none">→</span>
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
        <p className="text-[11px] uppercase tracking-[0.55em] text-white/60">Ready to</p>
        <h1 className="text-[32px] leading-tight font-bold text-white">
          <AppName className="tracking-[0.08em]" />
        </h1>
        <p className="text-[15px] text-white/80">
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
    <div className="w-full max-w-sm mx-auto text-center space-y-10">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-40 h-40 rounded-[32px] bg-gradient-to-br from-[#dbeafe] via-[#e5e7ff] to-[#fce7f3] flex items-center justify-center shadow-2xl">
            <span className="text-[44px]">🚗</span>
          </div>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-white/70">
            <span className="text-xl">🔍</span>
          </div>
        </div>
      </div>
      <div className="space-y-3.5">
        <p className="text-[11px] uppercase tracking-[0.55em] text-white/60">Explorar</p>
        <h1 className="text-[28px] font-semibold text-white leading-tight">Encontrar uma boleia</h1>
        <p className="text-[14px] text-white/80">
          Solicita uma boleia e sê recolhido no mesmo percurso pelo condutor. Sabe quem te leva e quando.
        </p>
      </div>
    </div>
  );
}

// Ecrã 3: "Publicar uma boleia"
function Screen3() {
  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-10">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-40 h-40 rounded-[32px] bg-gradient-to-br from-[#fef3c7] via-[#fde68a] to-[#fed7aa] flex items-center justify-center shadow-2xl">
            <span className="text-[44px]">🚘</span>
          </div>
          <div className="absolute -top-4 -left-4 w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-white/70">
            <span className="text-xl">📄</span>
          </div>
        </div>
      </div>
      <div className="space-y-3.5">
        <p className="text-[11px] uppercase tracking-[0.55em] text-white/60">Partilhar</p>
        <h1 className="text-[28px] font-semibold text-white leading-tight">Publicar uma boleia</h1>
        <p className="text-[14px] text-white/80">
          Publica uma boleia e recolhe passageiros pelo caminho. Decide o percurso e mantém o carro cheio.
        </p>
      </div>
    </div>
  );
}

// Ecrã 4: Termos e condições
function Screen4({
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
        <AppName className="text-4xl md:text-5xl font-bold text-white" />
        <p className="text-sm tracking-[0.4em] uppercase text-white/60">Vamos viajar juntos</p>
      </div>
      <p className="text-base text-white/90 leading-relaxed px-2">
        Para começares a usar a partilha de boleias, por favor concorda primeiro com os nossos{" "}
        <button
          type="button"
          onClick={onOpenTerms}
          aria-haspopup="dialog"
          aria-controls="onboarding-terms-sheet"
          className="underline font-semibold hover:text-white transition"
        >
          {termsTitle}
        </button>
      </p>
      <label className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-3xl p-5 cursor-pointer hover:bg-white/10 transition text-left">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => onAgreeChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="mt-1 w-6 h-6 rounded-lg border border-white/30 flex items-center justify-center text-xs font-black text-transparent peer-checked:bg-white peer-checked:text-black transition">
          ✓
        </span>
        <span className="text-sm text-white/90 leading-relaxed">
          Concordo com os termos e condições da partilha de boleias e confirmo que os li com atenção.
        </span>
      </label>
    </div>
  );
}

// Componente auxiliar para os benefícios
function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold bg-gradient-to-r from-[#FFE29F] via-[#FFA99F] to-[#FF719A] text-black shadow-[0_6px_16px_rgba(255,113,154,0.35)]">
        ✓
      </div>
      <span className="text-base text-white font-medium">{text}</span>
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

