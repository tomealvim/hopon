import Sheet from "./Sheet";
import { Button } from "./Button";
import AppName from "./AppName";

interface WelcomeSheetProps {
  open: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
  onGoToRides: () => void;
}

const STEPS = [
  {
    icon: "🚗",
    title: "Adiciona o teu veículo",
    desc: "Se tens carro, adiciona-o no perfil para poderes oferecer boleias.",
    cta: null,
  },
  {
    icon: "📅",
    title: "Cria um template de viagem",
    desc: "Define o teu percurso habitual (ex: Porto → Lisboa, Seg–Sex 08:00) e as boleias são geradas automaticamente.",
    cta: null,
  },
  {
    icon: "🔍",
    title: "Explora boleias disponíveis",
    desc: "Encontra condutores que passam pelo teu caminho e reserva um lugar.",
    cta: null,
  },
];

export default function WelcomeSheet({ open, onClose, onGoToProfile, onGoToRides }: WelcomeSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="" height="lg" footer={null}>
      <div className="px-1 pb-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-xs uppercase tracking-[0.4em] text-[#717973]">Bem-vindo ao</p>
          <h2 className="text-3xl font-extrabold text-[#1A1C19] tracking-tight">
            <AppName />
          </h2>
          <p className="text-sm text-[#717973] max-w-xs mx-auto leading-relaxed">
            O teu perfil está criado! Aqui tens os próximos passos para começar.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-3">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-[#f3f4ef] rounded-2xl p-4"
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[#1A1C19] mb-0.5">{step.title}</p>
                <p className="text-xs text-[#717973] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="grid gap-2 pt-1">
          <Button
            variant="primary"
            block
            onClick={onGoToProfile}
          >
            Ir para o meu perfil
          </Button>
          <Button
            variant="outline"
            block
            onClick={onGoToRides}
          >
            Criar template de viagem
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#717973] hover:text-[#414844] transition py-1"
          >
            Explorar primeiro
          </button>
        </div>
      </div>
    </Sheet>
  );
}
