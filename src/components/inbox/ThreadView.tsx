import { useState } from "react";
import type { Message, Thread, SystemEvent } from "../../pages/types/inbox";
import RideRequestCard from "./SystemCards/RideRequestCard";
import TimeChangedCard from "./SystemCards/TimeChangedCard";
import PaymentDueCard from "./SystemCards/PaymentDueCard";

export default function ThreadView({
  meId, thread, messages, onBack, onSystemAction, getUserName, onSendMessage,
}: {
  meId: string;
  thread: Thread;
  messages: Message[];
  onBack: () => void;
  onSystemAction: (
    action: "accept_request" | "decline_request" | "confirm_change" | "pay_now",
    payload?: { seats?: number; amount?: number }
  ) => void;
  getUserName: (id: string) => string;
  onSendMessage?: (text: string) => Promise<void>;
}) {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim() || !onSendMessage || sending) return;
    setSending(true);
    try {
      await onSendMessage(inputText.trim());
      setInputText("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <button className="text-2xl font-bold text-gray-900 hover:text-gray-600 transition" onClick={onBack} aria-label="Voltar">
          ←
        </button>
        <div className="text-sm font-semibold text-gray-900 truncate">{thread.title}</div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.map(m => (
          <div key={m.id} className={m.type === "text" ? (m.authorId === meId ? "flex justify-end mb-3" : "flex justify-start mb-3") : "mb-3"}>
            {m.type === "text" ? (
            <div className={m.authorId === meId ? "max-w-[75%] bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end text-gray-900 rounded-2xl px-4 py-2.5" : "max-w-[75%] bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl px-4 py-2.5 shadow-sm"}>
              <div className="text-sm">{m.text}</div>
              <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                {m.authorId && m.authorId !== meId && (
                  <span className="font-medium">{getUserName(m.authorId)}</span>
                )}
                <time>{timeAgo(m.ts)}</time>
              </div>
            </div>
            ) : (
              <SystemCardRenderer ev={m.system!} onSystemAction={onSystemAction} />
            )}
          </div>
        ))}
      </div>

      <footer className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-white">
        <input
          className="flex-1 px-4 py-2.5 border border-gray-200 bg-gray-50 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 placeholder:text-gray-400 disabled:opacity-50"
          placeholder="Escrever mensagem"
          title="Escrever mensagem"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="px-4 py-2.5 bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end text-gray-900 font-medium rounded-xl hover:opacity-95 transition disabled:opacity-50"
          onClick={handleSend}
          disabled={sending || !inputText.trim()}
        >
          {sending ? "..." : "Enviar"}
        </button>
      </footer>
    </div>
  );
}

function SystemCardRenderer({
  ev,
  onSystemAction,
}: {
  ev: SystemEvent;
  onSystemAction: (
    a: "accept_request" | "decline_request" | "confirm_change" | "pay_now",
    p?: { seats?: number; amount?: number }
  ) => void;
}) {
  if (ev.kind === "ride_request") {
    return (
      <RideRequestCard
        seats={ev.seats ?? 1}
        when={ev.when}            // pode ser undefined (card já aceita)
        origin={ev.origin}        // idem
        dest={ev.dest}            // idem
        message={ev.message}      // mensagem personalizada do passageiro
        onAccept={() => onSystemAction("accept_request", { seats: ev.seats })}
        onDecline={() => onSystemAction("decline_request")}
      />
    );
  }

  if (ev.kind === "time_changed") {
    return (
      <TimeChangedCard
        oldTime={ev.oldTime}      // opcional
        newTime={ev.newTime}      // opcional
        onConfirm={() => onSystemAction("confirm_change")}
      />
    );
  }

  if (ev.kind === "payment_due") {
    return (
      <PaymentDueCard
        amount={ev.amount ?? 2.0}
        onPay={() => onSystemAction("pay_now", { amount: ev.amount })}
      />
    );
  }

  if (ev.kind === "request_accepted") return <div className="text-center bg-green-500/20 border border-green-500/30 text-green-300 text-xs py-2 px-3 rounded-lg">Pedido aceite ✅</div>;
  if (ev.kind === "request_declined") return <div className="text-center bg-red-500/20 border border-red-500/30 text-red-300 text-xs py-2 px-3 rounded-lg">Pedido recusado</div>;
  if (ev.kind === "change_confirmed") return <div className="text-center bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs py-2 px-3 rounded-lg">Alteração confirmada</div>;
  if (ev.kind === "payment_paid") return <div className="text-center bg-green-500/20 border border-green-500/30 text-green-300 text-xs py-2 px-3 rounded-lg">Pagamento confirmado 💳</div>;

  return <div className="text-center bg-white/5 border border-white/10 text-white/70 text-xs py-2 px-3 rounded-lg">Atualização</div>;
}

function timeAgo(ts: number) {
  const delta = (Date.now() - ts) / 1000;
  if (delta < 60) return "agora";
  if (delta < 3600) return `${Math.floor(delta / 60)} min`;
  if (delta < 86400) return `${Math.floor(delta / 3600)} h`;
  return `${Math.floor(delta / 86400)} d`;
}
