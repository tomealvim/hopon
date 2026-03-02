import { useState } from "react";
import AppName from "../components/ui/AppName";
import OnboardingPage from "./OnboardingPage";

type AuthMode = "register" | "login";

interface LandingPageProps {
  onStart: (mode: AuthMode) => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    return (
      <OnboardingPage
        onComplete={() => {
          setShowOnboarding(false);
          onStart("register");
        }}
      />
    );
  }

  return (
    <div className="min-h-[100svh] bg-white flex flex-col overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-base font-extrabold tracking-tight text-gray-900">
            <AppName />
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStart("login")}
              className="h-9 px-4 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              Entrar
            </button>
            <button
              onClick={() => onStart("register")}
              className="h-9 px-4 rounded-full text-sm font-bold bg-gray-900 text-white shadow-sm hover:bg-gray-800 active:scale-95 transition-transform"
            >
              Criar conta
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-b from-[#F5E6D3] via-[#FAF0E8] to-white px-5 pt-16 pb-20">
        <div className="max-w-lg mx-auto text-center">
          <span className="inline-block text-[10px] uppercase tracking-[0.55em] text-gray-500 mb-6">
            Carpooling diário em Portugal
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-5 leading-[1.05] tracking-tight">
            Divide os custos.<br />
            <span className="bg-gradient-to-r from-[#FF9A5C] via-[#FF6B9D] to-[#FF719A] bg-clip-text text-transparent">
              Chega mais longe.
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-sm mx-auto">
            Divide gasolina e portagens com quem vai no mesmo caminho. Sem ganhos, sem taxas — só partilha real de custos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onStart("register")}
              className="h-14 px-8 rounded-full bg-gray-900 text-white text-sm font-bold tracking-wide shadow-lg active:scale-95 transition-transform"
            >
              Começar grátis →
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              className="h-14 px-8 rounded-full border-2 border-gray-200 text-gray-700 text-sm font-semibold bg-white hover:border-gray-300 active:scale-95 transition-transform"
            >
              Ver como funciona
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-5">
            Grátis · Sem subscrições · Paga apenas quando viajas
          </p>
        </div>

        {/* Mock visual */}
        <div className="max-w-xs mx-auto mt-14 relative">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* App bar mock */}
            <div className="bg-gradient-to-r from-[#FFD6A5] via-[#FFAEC0] to-[#FF719A] h-1.5 w-full" />
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Descobrir boleias</span>
                <span className="text-xs text-gray-400">Porto → Lisboa</span>
              </div>
            </div>
            {/* Ride cards mock */}
            {[
              { name: "Ricardo S.", time: "08:00", price: "4.50", seats: 2, verified: true },
              { name: "Ana M.", time: "08:15", price: "5.00", seats: 3, verified: true },
              { name: "João P.", time: "08:30", price: "3.80", seats: 1, verified: false },
            ].map((r, i) => (
              <div key={i} className={`px-4 py-3 flex items-center gap-3 ${i < 2 ? "border-b border-gray-50" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFD6A5] to-[#FF719A] flex items-center justify-center text-sm font-bold text-gray-900 flex-shrink-0">
                  {r.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-gray-900">{r.name}</span>
                    {r.verified && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">✓</span>}
                  </div>
                  <span className="text-[10px] text-gray-400">{r.time} · {r.seats} lugar{r.seats > 1 ? "es" : ""}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{r.price}€</span>
              </div>
            ))}
            <div className="px-4 py-3 bg-gray-50">
              <div className="h-8 rounded-full bg-gray-900 flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">Reservar lugar</span>
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -top-3 -right-3 bg-white rounded-2xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2">
            <span className="text-base">💸</span>
            <div>
              <div className="text-[10px] font-bold text-gray-900">Poupança média</div>
              <div className="text-xs font-extrabold text-green-600">60€/mês</div>
            </div>
          </div>
          <div className="absolute -bottom-3 -left-3 bg-white rounded-2xl shadow-lg border border-gray-100 px-3 py-2 flex items-center gap-2">
            <span className="text-base">⭐</span>
            <div>
              <div className="text-[10px] font-bold text-gray-900">Avaliação média</div>
              <div className="text-xs font-extrabold text-gray-900">4.9 / 5.0</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-5 py-10 bg-gray-900 text-white">
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { value: "100%", label: "Partilha real" },
            { value: "0€", label: "Taxa de registo" },
            { value: "2 min", label: "Para começar" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold bg-gradient-to-r from-[#FFD6A5] to-[#FF719A] bg-clip-text text-transparent">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Porquê o HopOn ── */}
      <section className="px-5 py-16">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] uppercase tracking-[0.5em] text-gray-400 text-center mb-3">Vantagens</p>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10 leading-tight">
            Porquê o <AppName />
          </h2>
          <div className="grid gap-4">
            <FeatureCard
              icon="💰"
              title="Custos reais, divisão justa"
              desc="O algoritmo calcula automaticamente gasolina + portagens e divide pelo número de lugares. Sem estimativas, sem negociação."
            />
            <FeatureCard
              icon="🗓️"
              title="Boleias automáticas"
              desc="Define o teu horário habitual uma vez (ex: Porto → Lisboa, Seg–Sex às 08:00) e a boleia é criada e sugerida automaticamente."
            />
            <FeatureCard
              icon="🛡️"
              title="Comunidade verificada"
              desc="Perfis verificados, avaliações reais após cada viagem e histórico transparente. Sabes sempre quem te leva."
            />
            <FeatureCard
              icon="💬"
              title="Comunicação integrada"
              desc="Conversa diretamente com o condutor ou passageiros dentro da app. Sem partilhar números de telemóvel."
            />
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="px-5 py-16 bg-[#F9F6F2]">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] uppercase tracking-[0.5em] text-gray-400 text-center mb-3">Simples</p>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10 leading-tight">
            Como funciona
          </h2>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-px bg-gray-200" aria-hidden="true" />
            <div className="flex flex-col gap-8">
              <Step n={1} title="Cria o teu perfil" desc="Regista-te em 2 minutos. Adiciona o teu veículo se fores condutor." />
              <Step n={2} title="Define o percurso habitual" desc='Cria um template de viagem recorrente. Ex: "Porto → Lisboa, Seg–Sex, 08:00".' />
              <Step n={3} title="Encontra ou publica boleias" desc='A app cruza o teu horário com boleias disponíveis e mostra-tas em "Para Ti".' />
              <Step n={4} title="Viaja e divide os custos" desc="O pagamento é feito pela carteira da app. Sem dinheiro em mãos, sem desconforto." />
            </div>
          </div>
        </div>
      </section>

      {/* ── Para condutores vs passageiros ── */}
      <section className="px-5 py-16">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] uppercase tracking-[0.5em] text-gray-400 text-center mb-3">Para todos</p>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10 leading-tight">
            Condutor ou passageiro?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <RoleCard
              emoji="🚗"
              role="Sou condutor"
              points={[
                "Recupera os custos do combustível",
                "Define o teu percurso e horário",
                "Aceita ou recusa reservas",
                "Avaliações que constroem reputação",
              ]}
              cta="Começar a oferecer boleias"
              onClick={() => onStart("register")}
            />
            <RoleCard
              emoji="🧳"
              role="Sou passageiro"
              points={[
                "Encontra boleias no teu percurso",
                "Preços transparentes e justos",
                "Perfis verificados e avaliados",
                "Carteira integrada — sem dinheiro",
              ]}
              cta="Encontrar uma boleia"
              onClick={() => onStart("register")}
            />
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-5 py-20 bg-gradient-to-b from-[#F5E6D3] to-[#FAF0E8]">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-3 leading-tight">
            Pronto para<br />começar?
          </h2>
          <p className="text-base text-gray-500 mb-8">
            Junta-te e começa a poupar nas tuas viagens diárias.
          </p>
          <button
            onClick={() => onStart("register")}
            className="w-full h-14 rounded-full bg-gradient-to-r from-[#FFD6A5] via-[#FFAEC0] to-[#FF719A] text-gray-900 text-sm font-bold shadow-lg active:scale-95 transition-transform mb-3"
          >
            Criar conta grátis →
          </button>
          <button
            onClick={() => onStart("login")}
            className="w-full h-12 rounded-full text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
          >
            Já tenho conta — Entrar
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 py-8 border-t border-gray-100 bg-white">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-extrabold text-gray-400 tracking-tight">
            <AppName />
          </span>
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} HopOn · Partilha de custos, não de lucros
          </p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition"
          >
            Como funciona
          </button>
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>
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

function RoleCard({
  emoji, role, points, cta, onClick,
}: {
  emoji: string; role: string; points: string[]; cta: string; onClick: () => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div>
        <span className="text-3xl">{emoji}</span>
        <h3 className="text-base font-bold text-gray-900 mt-2">{role}</h3>
      </div>
      <ul className="flex flex-col gap-2 flex-1">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs text-gray-600">
            <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">✓</span>
            {p}
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className="w-full h-10 rounded-full bg-gray-900 text-white text-xs font-bold active:scale-95 transition-transform"
      >
        {cta}
      </button>
    </div>
  );
}
