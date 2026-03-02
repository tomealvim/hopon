import { useState, useEffect } from "react";
import Sheet from "./Sheet";
import { Button } from "./Button";
import { apiRequest } from "../../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (message?: string) => void;
  offerTitle: string;
  price?: number | null;
  platformFee?: number | null;
  seats?: number;
  departureTime?: string | null;
};

export default function RequestSeatSheet({ open, onClose, onConfirm, offerTitle, price, platformFee, seats = 1, departureTime }: Props) {
  const [message, setMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const hasCost = price != null && price > 0;
  const totalCost = hasCost ? price * seats : 0;
  const hasEnough = walletBalance == null || !hasCost || walletBalance >= totalCost;

  // Breakdown: se temos platformFee, podemos mostrar custo sem comissão separado
  const hasFeeBreakdown = hasCost && platformFee != null && platformFee > 0;
  const baseCostPerSeat = hasFeeBreakdown ? price - platformFee! : price ?? 0;
  const totalBase = baseCostPerSeat * seats;
  const totalFee = hasFeeBreakdown ? platformFee! * seats : 0;

  useEffect(() => {
    if (!open || !hasCost) return;
    setBalanceLoading(true);
    apiRequest<{ balance: number }>("/wallet")
      .then((data) => setWalletBalance(Number(data.balance)))
      .catch(() => setWalletBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [open, hasCost]);

  const handleSubmit = () => {
    onConfirm(message.trim() || undefined);
    setMessage("");
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Pedir lugar"
      height="md"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleSubmit} disabled={!hasEnough}>
            {hasCost ? "Confirmar e pagar" : "Enviar pedido"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 p-1">
        <p className="text-sm text-gray-700">
          Vais pedir lugar em: <span className="font-semibold">{offerTitle}</span>
        </p>

        {hasCost && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Detalhes do custo</p>

            {hasFeeBreakdown ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Combustível + portagens ({seats} {seats > 1 ? "lugares" : "lugar"})
                  </span>
                  <span className="text-gray-700">€{totalBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Taxa de serviço HopOn (10%)</span>
                  <span className="text-gray-700">€{totalFee.toFixed(2)}</span>
                </div>
                <div className="my-1 border-t border-gray-200" />
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">€{totalCost.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Custo ({seats} {seats > 1 ? "lugares" : "lugar"} × €{price!.toFixed(2)})
                </span>
                <span className="font-semibold text-gray-900">€{totalCost.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Saldo na carteira</span>
              <span className={`font-semibold ${hasEnough ? "text-gray-900" : "text-red-600"}`}>
                {balanceLoading ? "..." : walletBalance != null ? `€${walletBalance.toFixed(2)}` : "—"}
              </span>
            </div>
            {!hasEnough && (
              <p className="text-xs text-red-600 mt-1">
                Saldo insuficiente. Carrega a carteira em Perfil → Carteira.
              </p>
            )}
          </div>
        )}

        {price != null && price > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 grid gap-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Política de cancelamento</p>
            <div className="flex justify-between text-xs text-gray-700">
              <span>Mais de 24h antes da partida</span>
              <span className="font-semibold text-green-700">Reembolso total</span>
            </div>
            <div className="flex justify-between text-xs text-gray-700">
              <span>Entre 2h e 24h antes</span>
              <span className="font-semibold text-amber-700">Reembolso 50%</span>
            </div>
            <div className="flex justify-between text-xs text-gray-700">
              <span>Menos de 2h antes</span>
              <span className="font-semibold text-red-700">Sem reembolso</span>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="request-message" className="block text-xs font-semibold text-gray-700 mb-1">
            Mensagem para o condutor (opcional)
          </label>
          <textarea
            id="request-message"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            rows={4}
            placeholder="Ex.: Oi! Posso encontrar na estação. Levo apenas uma mochila. Obrigado!"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={300}
            aria-label="Escrever mensagem para o condutor"
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {message.length} / 300
          </div>
        </div>

        {!hasCost && !message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Dica:</strong> Uma mensagem personalizada ajuda o condutor a decidir mais rapidamente!
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
