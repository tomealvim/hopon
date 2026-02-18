import { useState } from "react";
import Sheet from "./Sheet";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (message?: string) => void;
  offerTitle: string;
};

export default function RequestSeatSheet({ open, onClose, onConfirm, offerTitle }: Props) {
  const [message, setMessage] = useState("");

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
          <Button variant="outline" className="flex-1" onClick={handleSubmit}>
            Enviar pedido
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 p-1">
        <p className="text-sm text-gray-700">
          Vais pedir lugar em: <span className="font-semibold">{offerTitle}</span>
        </p>

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

        {!message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>Dica:</strong> Uma mensagem personalizada ajuda o condutor a decidir mais rapidamente!
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

