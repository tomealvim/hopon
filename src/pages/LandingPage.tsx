import { useState } from "react";
import AppName from "../components/ui/AppName";
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
    <div className="min-h-[100svh] bg-white flex flex-col overflow-x-hidden">

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-[#F5E6D3] via-[#FAF0E8] to-white px-6 pt-16 pb-14 text-center flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <span className="text-[10px] uppercase tracking-[0.55em] text-gray-500 mb-5 block">
            Bem-vindo ao
          </span>
          <h1 className="text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
            <AppName />
          </h1>
          <p className="text-xl font-semibold text-gray-900 mb-3 leading-snug">
            Partilha os custos das tuas viagens diárias
          </p>
          <p className="text-base text-gray-600 mb-10 leading-relaxed">
            Vai de carro todos os dias para o mesmo sítio? Divide gasolina e portagens com quem passa pelo mesmo caminho.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onStart("register")}
              className="w-full h-14 rounded-full bg-gray-900 text-white text-sm font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
            >
              Criar conta grátis
            </button>
            <button
              onClick={() => onStart("login")}
              className="w-full h-14 rounded-full border-2 border-gray-200 text-gray-900 text-sm font-bold bg-white active:scale-95 transition-transform hover:border-gray-300"
            >
              Já tenho conta
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Grátis · Sem subscrições · Paga apenas quando viajas
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-10 flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xs uppercase tracking-[0.4em] text-gray-500 text-center mb-6">Porquê o HopOn</h2>
          <div className="grid gap-3">
            <FeatureCard
              icon="💰"
              title="Poupa dinheiro"
              desc="Divide gasolina e portagens automaticamente. O algoritmo calcula o custo justo por lugar."
            />
            <FeatureCard
              icon="🚗"
              title="Ganha rendimento"
              desc="Tens carro? Publica uma boleia e recupera os custos das tuas viagens diárias."
            />
            <FeatureCard
              icon="🤝"
              title="Comunidade de confiança"
              desc="Perfis verificados, avaliações reais e histórico de viagens. Sabes sempre quem te leva."
            />
            <FeatureCard
              icon="⏰"
              title="Boleias automáticas"
              desc="Define o teu horário habitual e as boleias são criadas e sugeridas automaticamente."
            />
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-6 py-10 bg-[#F9F6F2] flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">Como funciona</h2>
          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-5 top-5 bottom-5 w-px bg-gray-200" aria-hidden="true" />
            <div className="flex flex-col gap-8">
              <Step
                n={1}
                title="Cria o teu perfil"
                desc="Regista-te em 2 minutos. Adiciona o teu veículo se fores condutor."
              />
              <Step
                n={2}
                title="Define o teu percurso habitual"
                desc="Cria um template (ex: Porto → Lisboa, Seg–Sex às 08:00) e a app trata do resto."
              />
              <Step
                n={3}
                title="Viaja e divide os custos"
                desc="A boleia é criada automaticamente. O pagamento é feito pela app, sem dinheiro em mãos."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-14 text-center flex-shrink-0">
        <div className="max-w-sm mx-auto">
          <p className="text-2xl font-bold text-gray-900 mb-2">Pronto para começar?</p>
          <p className="text-sm text-gray-500 mb-8">Junta-te a quem já está a poupar nas viagens diárias.</p>
          <button
            onClick={() => onStart("register")}
            className="w-full h-14 rounded-full bg-gradient-to-r from-[#FFD6A5] via-[#FFAEC0] to-[#FF719A] text-gray-900 text-sm font-bold shadow-md active:scale-95 transition-transform"
          >
            Começar agora →
          </button>
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="mt-4 text-sm text-gray-500 underline underline-offset-2"
          >
            Ver demonstração completa
          </button>
        </div>
      </section>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-0.5">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 relative">
      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 z-10">
        {n}
      </div>
      <div className="pt-1.5">
        <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
