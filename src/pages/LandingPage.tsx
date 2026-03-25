import { useState } from "react";
import OnboardingPage from "./OnboardingPage";

type AuthMode = "register" | "login";

interface LandingPageProps {
  onStart: (mode: AuthMode) => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  if (showHowItWorks) {
    return (
      <OnboardingPage
        onComplete={() => {
          setShowHowItWorks(false);
          onStart("register");
        }}
      />
    );
  }

  return (
    <div className="min-h-[100svh] bg-[#F9FAF5] flex flex-col overflow-x-hidden font-manrope">

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-[#E8F5EC] via-[#F3FAF5] to-[#F9FAF5] px-6 pt-16 pb-14 text-center flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <span className="text-[10px] uppercase tracking-[0.55em] text-[#717973] mb-5 block">
            Bem-vindo ao
          </span>
          <h1 className="text-6xl font-noto-serif italic font-bold text-[#1B4332] mb-4 leading-tight">
            HopOn
          </h1>
          <p className="text-xl font-semibold text-[#1A1C19] mb-3 leading-snug">
            Partilha os custos das tuas viagens diarias
          </p>
          <p className="text-base text-[#414844] mb-10 leading-relaxed">
            Vai de carro todos os dias para o mesmo sitio? Divide gasolina e portagens com quem passa pelo mesmo caminho.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onStart("register")}
              className="w-full h-14 rounded-full bg-[#52B788] text-white text-sm font-bold shadow-lg shadow-[#52B788]/20 active:scale-95 transition-transform"
            >
              Criar conta gratis
            </button>
            <button
              onClick={() => onStart("login")}
              className="w-full h-14 rounded-full border-2 border-[#D0E8DC] text-[#1B4332] text-sm font-bold bg-white active:scale-95 transition-transform hover:border-[#52B788]"
            >
              Ja tenho conta
            </button>
          </div>
          <p className="text-xs text-[#717973] mt-4">
            Gratis - Sem subscricoes - Paga apenas quando viajas
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-10 flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xs uppercase tracking-[0.4em] text-[#717973] text-center mb-6">Porque o HopOn</h2>
          <div className="grid gap-3">
            <FeatureCard
              icon="savings"
              title="Poupa dinheiro"
              desc="Divide gasolina e portagens automaticamente. O algoritmo calcula o custo justo por lugar."
            />
            <FeatureCard
              icon="directions_car"
              title="Ganha rendimento"
              desc="Tens carro? Publica uma boleia e recupera os custos das tuas viagens diarias."
            />
            <FeatureCard
              icon="verified_user"
              title="Comunidade de confianca"
              desc="Perfis verificados, avaliacoes reais e historico de viagens. Sabes sempre quem te leva."
            />
            <FeatureCard
              icon="schedule"
              title="Boleias automaticas"
              desc="Define o teu horario habitual e as boleias sao criadas e sugeridas automaticamente."
            />
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-10 bg-[#F3F4EF] flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xl font-bold text-[#1B4332] mb-8 text-center font-noto-serif italic">Como funciona</h2>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-px bg-[#D0E8DC]" aria-hidden="true" />
            <div className="flex flex-col gap-8">
              <Step
                n={1}
                title="Cria o teu perfil"
                desc="Regista-te em 2 minutos. Adiciona o teu veiculo se fores condutor."
              />
              <Step
                n={2}
                title="Define o teu percurso habitual"
                desc="Cria um template (ex: Porto - Lisboa, Seg-Sex as 08:00) e a app trata do resto."
              />
              <Step
                n={3}
                title="Viaja e divide os custos"
                desc="A boleia e criada automaticamente. O pagamento e feito pela app, sem dinheiro em maos."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-14 text-center flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <p className="text-2xl font-bold text-[#1B4332] mb-2 font-noto-serif italic">Pronto para comecar?</p>
          <p className="text-sm text-[#717973] mb-8">Junta-te a quem ja esta a poupar nas viagens diarias.</p>
          <button
            onClick={() => onStart("register")}
            className="w-full h-14 rounded-full bg-[#52B788] text-white text-sm font-bold shadow-sm active:scale-95 transition-transform"
          >
            Comecar agora
          </button>
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="mt-4 text-sm text-[#717973] underline underline-offset-2"
          >
            Ver demonstracao completa
          </button>
        </div>
      </section>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 bg-white border border-[#e7e9e4] rounded-2xl p-4 shadow-sm">
      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-[#95D5B2]/25 text-[#006c48]">
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1C19] mb-0.5">{title}</p>
        <p className="text-xs text-[#717973] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 relative">
      <div className="w-10 h-10 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 z-10">
        {n}
      </div>
      <div className="pt-1.5">
        <p className="text-sm font-semibold text-[#1A1C19] mb-1">{title}</p>
        <p className="text-xs text-[#717973] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
