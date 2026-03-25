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

// Imagens placeholder do Stitch (substituir por assets reais antes do lançamento)
const IMG = {
  s1: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvkdekYhfk3yiyc23xe8ZFG6M6YDwh_fsPmv7rmAA-ecpWTlTtPzAQNzH7phfqo5TIjga_dV5h-1S9nttOjAgdbEUhO_wLl_mWOmkqeoDyRXVDQn6mSVvOHx7ackYy5TbvKsfSvTwhYBD3qEIEzJpVx2BZSrLL7l1yPh2PTjCcsH7vsvO3VAQJW0QfvR0uejMt13O97f_BMpPAjOQeu0Yi_MYRLoVB-Oev9U0QQSpQd52aVkjTNxJ4kYQTKXtqMXcbamQbG_W16wSu",
  s2: "https://lh3.googleusercontent.com/aida-public/AB6AXuDdB8Awjwet_gf7QKZ2WUILGEdKxbFPME7puwbf18FAkfVvJQRhL5-jbWyInZJFVy1rf6FdbS7NlyITBu6qgAHsP-4McB5QJNGEZBYsUeeAPDQnZw4LccmFMlhBKNFH0nXIIfkJU54tOEtwJlCRkcc0QLm08yb2gigKvixnIUCuXfAfLvxCmy8TMes51qFfHEAv2xXZQqJznGmquAz9uuT9TGy3HcKu1dYGsHIAZm7oadlEHH49iy8wJBKe0CnqZRk0UlQxvQc3RvZ1",
  s3: "https://lh3.googleusercontent.com/aida-public/AB6AXuCx4rSuQyrEJ7CIhf23-Z4yigzeta0aDvEC1kiB-7mCDBXXPIKGtxyJjwLKY-zpxgYrcu9HK8PNoDj6hM2UDPvvpPGrifuA-GwSMRiFdPfGhfgmMcx0kwjDNu884uFCDi0MST_Ybb4KjLqhq9jqqi0D47Dox1IHJEu2fOD6PeaJtzGbOzSZOLUYHXVd2ZW5mwVtylIg4-B53ZtsAg_8uFmEBv5-xAoBpL1w-Uba0SELOgfoZ9P5NKvENlqefZ4jP6KZ9k85a-j_MD5T",
  s5: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcRXnz3pjlJWCywwoxMBejarExNmswvt9KD6Gu54C_0v6tYP5PsIzQ1XNXwOPp4x5hOl6T-SqU9oLRuhWvdtU4HT2My6KgbvRfQ7P3itQoQbItKK-INRpYL3WDqxJNHMrB0CJt6vpeu82w7leGWCQpZ8jWG3ep5IeZjZRim1oFaDIqjRSRiL7AAjdNuEM-xRcu8UCt-oDmMT27AhWnnCElzS_KW517NCaLetkxJd6e2P7e38aMllIV5KUaOILbhU-_LBW3sPhN_IgE",
};

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [currentScreen, setCurrentScreen] = useState<OnboardingScreen>(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const isFinalScreen = currentScreen === 5;
  const isLocationScreen = currentScreen === 4;

  const advance = () => {
    if (currentScreen < 5) {
      setCurrentScreen((prev) => (prev + 1) as OnboardingScreen);
    } else if (agreedToTerms) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      onComplete("register");
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
    navigator.geolocation.getCurrentPosition(
      () => { localStorage.setItem(LOCATION_PERMISSION_KEY, "granted"); advance(); },
      () => { localStorage.setItem(LOCATION_PERMISSION_KEY, "declined"); advance(); },
      { timeout: 8000 },
    );
  };

  // Screen 1 tem o seu proprio layout (dark bg + bottom sheet)
  if (currentScreen === 1) {
    return <Screen1Welcome onNext={advance} />;
  }

  return (
    <div className="min-h-[100svh] bg-[#F8F9F4] font-manrope flex flex-col overflow-x-hidden text-[#1A1C19]">

      {/* Header fixo com glassmorphism */}
      <header className="fixed top-0 w-full z-50 h-16 bg-[#F8F9F4]/70 backdrop-blur-xl">
        <div className="max-w-mobile mx-auto flex justify-between items-center px-6 h-full">
          <div className="w-10 flex items-center">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 text-[#1B4332] active:scale-95 transition-transform"
              aria-label="Voltar"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </div>
          <h1 className="font-noto-serif italic text-2xl font-bold text-[#1B4332]">HopOn</h1>
          <span className="w-10 text-right text-sm font-semibold text-[#1B4332]/60">
            {currentScreen}/5
          </span>
        </div>
      </header>

      {/* Conteudo principal */}
      <main className="flex-grow pt-16 pb-40 flex flex-col max-w-mobile mx-auto w-full">
        {currentScreen === 2 && <Screen2 />}
        {currentScreen === 3 && <Screen3 />}
        {currentScreen === 4 && <Screen4Location onAllow={handleAllowLocation} />}
        {currentScreen === 5 && (
          <Screen5Final
            agreedToTerms={agreedToTerms}
            onAgreeChange={setAgreedToTerms}
            onOpenTerms={() => setIsTermsOpen(true)}
            onLogin={() => onComplete("login")}
            termsTitle={TERMS_TITLE}
          />
        )}
      </main>

      {/* Rodape fixo: dots de progresso + CTA */}
      <footer
        className="fixed bottom-0 left-0 w-full px-6 pt-4 bg-gradient-to-t from-[#F8F9F4] via-[#F8F9F4]/95 to-transparent"
        style={{ paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-mobile mx-auto flex flex-col items-center gap-4">
          {/* Dots de progresso */}
          <div className="flex items-center gap-2.5">
            {([1, 2, 3, 4, 5] as OnboardingScreen[]).map((step) => (
              <div
                key={step}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  step === currentScreen ? "w-6 bg-[#52B788]" : "w-2 bg-[#D0E8DC]"
                )}
              />
            ))}
          </div>
          {/* Botao principal */}
          <button
            type="button"
            onClick={handleNext}
            disabled={isFinalScreen && !agreedToTerms}
            className={cn(
              "w-full h-14 rounded-full font-bold text-base flex items-center justify-center gap-2",
              "transition-all duration-150 active:scale-[0.98]",
              "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100",
              isLocationScreen
                ? "bg-transparent text-[#1B4332]/70 font-medium text-sm"
                : "bg-[#52B788] text-white shadow-lg shadow-[#52B788]/20"
            )}
          >
            {isLocationScreen ? "Agora nao" : isFinalScreen ? "Comecar" : "Seguinte"}
            {!isLocationScreen && (
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            )}
          </button>
        </div>
      </footer>

      {/* Sheet de Termos */}
      <Sheet
        open={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        title={TERMS_TITLE}
        height="lg"
      >
        <div id="onboarding-terms-sheet" className="space-y-6 text-sm text-[#414844]">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="space-y-2">
              <h4 className="text-base font-semibold text-[#1A1C19]">{section.title}</h4>
              <p className="leading-relaxed">{section.content}</p>
            </section>
          ))}
          <p className="text-xs text-[#717973]">
            Estes Termos e Condicoes sao preliminares e serao validados juridicamente antes do
            lancamento publico. Ultima atualizacao: {TERMS_LAST_UPDATED}.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

// ─── Ecra 1: layout dark + bottom sheet ───────────────────────────────────
function Screen1Welcome({ onNext }: { onNext: () => void }) {
  const features = [
    { icon: "savings",  label: "Poupar dinheiro" },
    { icon: "payments", label: "Gerar rendimento" },
    { icon: "group",    label: "Conhecer pessoas" },
    { icon: "traffic",  label: "Superar transito" },
  ];

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Background desfocado */}
      <img
        src={IMG.s1}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover opacity-40 blur-md scale-105 pointer-events-none"
      />
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Logo no topo sobre o escuro */}
      <header className="relative z-10 pt-12 pb-4 flex justify-center">
        <span className="text-2xl font-noto-serif italic font-bold text-white drop-shadow-sm">HopOn</span>
      </header>

      {/* Bottom sheet */}
      <div
        className="relative z-10 mt-auto bg-[#F9FAF5] rounded-t-[2.5rem] w-full max-h-[90vh] overflow-y-auto flex flex-col items-center"
        style={{ boxShadow: "0 -8px 32px rgba(27,67,50,0.08)" }}
      >
        <div className="w-full max-w-mobile">
        {/* Handlebar */}
        <div className="flex justify-center pt-4">
          <div className="w-12 h-1.5 bg-[#c1c8c2] rounded-full" />
        </div>

        <div className="px-6" style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}>
          {/* Hero com imagem inclinada */}
          <section className="mt-6 relative h-[280px] w-full shrink-0">
            <div
              className="absolute inset-0 rounded-[2rem] overflow-hidden bg-[#f3f4ef]"
              style={{
                transform: "rotate(-2deg)",
                boxShadow: "0 8px 32px rgba(27,67,50,0.08)",
              }}
            >
              <img
                src={IMG.s1}
                alt="Grupo de amigos a rir dentro de um carro"
                className="w-full h-full object-cover"
                style={{ filter: "grayscale(10%) contrast(110%)" }}
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#75daa8]/20 rounded-full blur-2xl pointer-events-none" />
          </section>

          {/* Titulo + descricao */}
          <section className="mt-8 space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-noto-serif italic font-bold text-[#1b4332] leading-tight">
                Ready to HopOn
              </h1>
              <p className="text-base text-[#414844] leading-relaxed">
                Vamos viajar juntos e tornar cada boleia mais simples, segura e economica.
              </p>
            </div>

            {/* Bento grid 2x2 estrelado */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {features.map((f, i) => (
                <div
                  key={f.icon}
                  className={cn(
                    "p-4 bg-[#f3f4ef] rounded-xl flex flex-col justify-between h-28",
                    i % 2 === 1 && "translate-y-3"
                  )}
                >
                  <span className="material-symbols-outlined text-[#006c48] text-2xl">{f.icon}</span>
                  <span className="font-manrope text-xs font-bold text-[#1b4332] uppercase tracking-tight">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA + dots */}
          <section className="mt-14">
            <button
              type="button"
              onClick={onNext}
              className="w-full py-5 px-8 bg-[#52B788] text-white font-bold rounded-full flex items-center justify-between active:scale-[0.98] transition-all duration-200"
              style={{ boxShadow: "0 8px 32px rgba(27,67,50,0.08)" }}
            >
              <span className="text-lg font-manrope">Seguinte</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <div className="mt-6 flex justify-center gap-2">
              <div className="h-1.5 w-8 rounded-full bg-[#006c48]" />
              {[2, 3, 4, 5].map((s) => (
                <div key={s} className="h-1.5 w-2 rounded-full bg-[#c1c8c2]" />
              ))}
            </div>
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ecra 2: "Partilha e Poupa" ───────────────────────────────────────────
function Screen2() {
  const benefits = [
    { icon: "payments", text: "Custos divididos" },
    { icon: "verified_user", text: "Pagamentos seguros" },
    { icon: "visibility", text: "Transparencia total" },
    { icon: "task_alt", text: "Sem surpresas" },
  ];
  return (
    <div className="flex flex-col">
      {/* Imagem edge-to-edge com gradient */}
      <section className="relative w-full aspect-[4/3] overflow-hidden">
        <img
          src={IMG.s2}
          alt="Passageiro e condutor a sorrir dentro do carro"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9F4] via-[#F8F9F4]/10 to-transparent" />
      </section>
      {/* Conteudo sobreposto */}
      <div className="px-7 -mt-10 relative z-10 flex flex-col gap-7">
        <div>
          <h2 className="font-noto-serif italic text-[2.4rem] leading-tight text-[#1B4332] mb-3">
            Partilha e Poupa
          </h2>
          <p className="text-[#1A1C19]/80 text-[1.05rem] leading-relaxed">
            Divide os custos da viagem com outros passageiros e reduz as tuas despesas mensais.
          </p>
        </div>
        <div className="space-y-5">
          {benefits.map((b) => (
            <div key={b.text} className="flex items-center gap-4">
              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#95D5B2]/20 text-[#52B788]">
                <span className="material-symbols-outlined text-2xl">{b.icon}</span>
              </div>
              <span className="font-semibold text-[#1B4332] text-lg">{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ecra 3: "Comunidade Segura" ──────────────────────────────────────────
function Screen3() {
  const features = [
    { icon: "verified_user", text: "Perfis verificados" },
    { icon: "star", text: "Avaliacoes reais" },
    { icon: "forum", text: "Chat integrado" },
    { icon: "support_agent", text: "Suporte 24/7" },
  ];
  return (
    <div className="flex flex-col">
      {/* Imagem com badge */}
      <section className="px-5 pt-4">
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#e7e9e4] shadow-[0_8px_32px_-4px_rgba(26,28,25,0.08)]">
          <img
            src={IMG.s3}
            alt="Dois jovens a conversar confortavelmente no carro"
            className="w-full h-full object-cover"
          />
          {/* Badge de confianca */}
          <div className="absolute top-4 left-4 bg-[#95D5B2] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <span
              className="material-symbols-outlined text-[#1B4332] text-base"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              check_circle
            </span>
            <span className="text-[#1B4332] font-bold text-xs tracking-wide">Confianca Total</span>
          </div>
        </div>
      </section>
      {/* Conteudo */}
      <section className="px-7 pt-7 flex flex-col gap-6">
        <div>
          <h2 className="font-noto-serif italic text-[2.4rem] leading-tight text-[#1B4332] mb-3">
            Comunidade Segura
          </h2>
          <p className="text-[#1A1C19]/80 text-[1.05rem] leading-relaxed">
            Conhece pessoas novas e viaja com confianca atraves do nosso sistema de perfis verificados.
          </p>
        </div>
        {/* Bento grid 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#F3F4EF]"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#95D5B2] flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[#1B4332] text-lg"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                >
                  {f.icon}
                </span>
              </div>
              <span className="font-bold text-[#1B4332] text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Ecra 4: Permissao de localizacao ─────────────────────────────────────
function Screen4Location({ onAllow }: { onAllow: () => void }) {
  const benefits = [
    "Boleias ordenadas pela distancia a ti",
    "Sugestoes automaticas para o teu trajeto",
    "Alerta quando ha boleia disponivel perto",
  ];
  return (
    <div className="flex flex-col items-center px-7 pt-10 gap-8">
      {/* Icone de localizacao */}
      <div className="w-24 h-24 rounded-full bg-[#95D5B2]/25 flex items-center justify-center shadow-[0_8px_32px_-4px_rgba(26,28,25,0.08)]">
        <span
          className="material-symbols-outlined text-[#1B4332]"
          style={{ fontSize: "48px", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48" }}
        >
          location_on
        </span>
      </div>
      {/* Texto */}
      <div className="text-center space-y-3 max-w-xs">
        <h2 className="font-noto-serif italic text-[2.4rem] leading-tight text-[#1B4332]">
          Boleias perto de ti
        </h2>
        <p className="text-[#1A1C19]/80 text-[1.05rem] leading-relaxed">
          Para encontrares boleias na tua zona e receberes sugestoes personalizadas, precisamos de saber onde estas.
        </p>
      </div>
      {/* Benefits */}
      <div className="w-full space-y-3">
        {benefits.map((text) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-2xl bg-[#F3F4EF] border border-[#e7e9e4] px-4 py-3.5"
          >
            <div className="w-6 h-6 rounded-full bg-[#52B788] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white" style={{ fontSize: "14px" }}>
                check
              </span>
            </div>
            <span className="text-sm font-medium text-[#1A1C19]">{text}</span>
          </div>
        ))}
      </div>
      {/* Botao primario de permitir */}
      <button
        type="button"
        onClick={onAllow}
        className="w-full h-14 rounded-full bg-[#1B4332] text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-[#1B4332]/20"
      >
        <span className="material-symbols-outlined text-xl">my_location</span>
        Permitir localizacao
      </button>
    </div>
  );
}

// ─── Ecra 5: "Tudo Pronto!" ────────────────────────────────────────────────
function Screen5Final({
  agreedToTerms,
  onAgreeChange,
  onOpenTerms,
  onLogin,
  termsTitle,
}: {
  agreedToTerms: boolean;
  onAgreeChange: (v: boolean) => void;
  onOpenTerms: () => void;
  onLogin: () => void;
  termsTitle: string;
}) {
  return (
    <div className="flex flex-col max-w-md mx-auto w-full">
      {/* Hero */}
      <div className="relative mx-5 mt-4 aspect-[4/5] rounded-xl overflow-hidden bg-[#e7e9e4] shadow-[0_8px_32px_-4px_rgba(26,28,25,0.08)]">
        <img
          src={IMG.s5}
          alt="Pessoa confiante a sair do carro"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1B4332]/25 to-transparent" />
      </div>
      {/* Texto */}
      <div className="px-7 mt-8 flex flex-col items-center text-center gap-6">
        <div className="space-y-2">
          <h2 className="font-noto-serif italic text-[2.4rem] leading-tight text-[#1B4332]">
            Tudo Pronto!
          </h2>
          <p className="text-[#1A1C19]/80 text-[1.05rem] leading-relaxed">
            Estas a um passo de comecar a tua primeira boleia com a{" "}
            <span className="text-[#1B4332] font-bold">HopOn</span>
          </p>
        </div>
        {/* Checkbox de termos */}
        <label className="flex items-start gap-4 bg-[#F3F4EF] border border-[#e7e9e4] rounded-2xl p-4 cursor-pointer w-full text-left hover:bg-[#edeee9] transition-colors">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => onAgreeChange(e.target.checked)}
            className="sr-only peer"
          />
          <span className="mt-0.5 w-6 h-6 flex-shrink-0 rounded-lg border-2 border-[#D0E8DC] flex items-center justify-center transition-all peer-checked:bg-[#52B788] peer-checked:border-[#52B788]">
            {agreedToTerms && (
              <span className="material-symbols-outlined text-white" style={{ fontSize: "14px" }}>
                check
              </span>
            )}
          </span>
          <span className="text-sm text-[#1A1C19]/80 leading-relaxed">
            Concordo com os{" "}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onOpenTerms(); }}
              className="font-bold text-[#1B4332] underline underline-offset-2 decoration-[#52B788]/60"
            >
              {termsTitle}
            </button>{" "}
            e confirmo que os li com atencao.
          </span>
        </label>
        {/* Link de login */}
        <p className="text-sm text-[#1A1C19]/60">
          Ja tens conta?{" "}
          <button
            type="button"
            onClick={onLogin}
            className="font-bold text-[#1B4332] underline underline-offset-2 decoration-[#52B788]/60"
          >
            Iniciar sessao
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Helpers exportados ────────────────────────────────────────────────────
export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  console.log("Onboarding resetado! Recarrega a pagina para ver o onboarding novamente.");
}

if (typeof window !== "undefined") {
  (window as any).resetOnboarding = resetOnboarding;
}
