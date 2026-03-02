import { useState } from "react";
import Sheet from "./Sheet";
import { Button } from "./Button";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

type Role = "passenger" | "driver";

type Props = {
  open: boolean;
  role: Role;
  onClose: () => void;
  onAccepted: () => void;
};

const POLICY_CONTENT = {
  passenger: {
    title: "Política de viagens — Passageiro",
    sections: [
      {
        heading: "Cancelamento",
        text: "Podes cancelar até 2 horas antes da partida com reembolso total. Cancelamentos tardios ficam sujeitos a retenção de 50% do valor pago.",
      },
      {
        heading: "No-show",
        text: "Se não aparecer no ponto de encontro dentro de 10 minutos após o horário acordado, a reserva pode ser cancelada pelo condutor sem reembolso.",
      },
      {
        heading: "Taxa de serviço",
        text: "O HopOn cobra uma taxa de 10% sobre o preço por lugar para cobrir custos de plataforma, suporte e seguro.",
      },
      {
        heading: "Comportamento",
        text: "Esperamos que todos os passageiros respeitem o veículo e o condutor. Comportamentos inadequados podem resultar em suspensão da conta.",
      },
      {
        heading: "Responsabilidade",
        text: "O HopOn facilita a ligação entre condutores e passageiros mas não é responsável por atrasos, acidentes ou outros imprevistos durante a viagem.",
      },
    ],
  },
  driver: {
    title: "Política de viagens — Condutor",
    sections: [
      {
        heading: "Cancelamento",
        text: "Deves avisar os passageiros com o máximo de antecedência possível. Cancelamentos frequentes podem afetar a tua pontuação e visibilidade na plataforma.",
      },
      {
        heading: "Partilha de custos",
        text: "Os valores publicados devem refletir partilha de custos reais (combustível + portagens). O HopOn não permite publicar boleias com fins lucrativos.",
      },
      {
        heading: "Teto de preço",
        text: "O preço por lugar não pode exceder 20% acima do custo real calculado pela plataforma para garantir equidade.",
      },
      {
        heading: "Taxa de serviço",
        text: "O HopOn retém 10% do preço por lugar como taxa de plataforma. O condutor recebe os restantes 90% após a conclusão da viagem.",
      },
      {
        heading: "Comportamento",
        text: "O condutor deve respeitar os passageiros e as preferências indicadas (música, silêncio, animais, etc.). Comportamentos inadequados resultam em suspensão.",
      },
      {
        heading: "Segurança",
        text: "O condutor é responsável pela condução segura do veículo. Certifica-te de que o seguro do veículo cobre transporte de passageiros.",
      },
    ],
  },
};

export default function PolicyAcceptanceSheet({ open, role, onClose, onAccepted }: Props) {
  const { refresh } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policy = POLICY_CONTENT[role];

  const handleAccept = async () => {
    if (!accepted) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest("/auth/me/accept-policy", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      // Atualizar o estado do utilizador no contexto
      await refresh();
      onAccepted();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao guardar. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAccepted(false);
    setError(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={policy.title}
      height="lg"
      footer={
        <div className="grid gap-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Li e aceito as regras de viagem do HopOn
            </span>
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleAccept}
              disabled={!accepted || loading}
            >
              {loading ? "A guardar..." : "Aceitar e continuar"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 p-1">
        <p className="text-sm text-gray-600">
          Para {role === "passenger" ? "reservar boleias" : "publicar boleias"} no HopOn, precisas de aceitar as seguintes regras:
        </p>

        {policy.sections.map((section) => (
          <div key={section.heading}>
            <p className="text-sm font-semibold text-gray-800 mb-1">{section.heading}</p>
            <p className="text-sm text-gray-600">{section.text}</p>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
