import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useInbox } from "../contexts/InboxContext";
import { useAuth } from "../contexts/AuthContext";
import type { Thread, Message, SystemEvent } from "./types/inbox";
import ThreadView from "../components/inbox/ThreadView";
import InboxRow from "../components/inbox/InboxRow";

type InboxPageProps = {
  initialThreadId?: string;
  onThreadClosed?: () => void;
};

export default function InboxPage({ initialThreadId, onThreadClosed }: InboxPageProps = {}) {
  const { threads, messagesByThread, markThreadAsRead, addMessage, loadMessages, sendMessage, isLoading } = useInbox();
  const { user } = useAuth();
  const meId = user?.id ?? "";
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasOpenedInitialThread = useRef(false);

  useEffect(() => {
    hasOpenedInitialThread.current = false;
  }, [initialThreadId]);

  useEffect(() => {
    if (initialThreadId && !hasOpenedInitialThread.current) {
      const thread = threads.find(t => t.id === initialThreadId);
      if (thread) {
        setOpenThreadId(initialThreadId);
        markThreadAsRead(initialThreadId);
        loadMessages(initialThreadId);
        hasOpenedInitialThread.current = true;
        onThreadClosed?.();
      }
    }
  }, [initialThreadId, threads, markThreadAsRead, loadMessages, onThreadClosed]);

  const sections = useMemo(() => {
    const pedidos = threads.filter(
      t => t.kind === "ride" && t.lastEvent?.type === "system" && (t.lastEvent.system as SystemEvent).kind === "ride_request"
    );
    const viagens = threads.filter(
      t => t.kind === "ride" && !(t.lastEvent?.type === "system" && (t.lastEvent.system as SystemEvent).kind === "ride_request")
    );
    const pessoas = threads.filter(t => t.kind === "dm");
    return { pedidos, viagens, pessoas };
  }, [threads]);

  const openThread = useCallback((tid: string) => {
    try {
      setError(null);
      setOpenThreadId(tid);
      markThreadAsRead(tid);
      loadMessages(tid);
    } catch (err) {
      setError("Erro ao abrir conversa");
      console.error("Error opening thread:", err);
    }
  }, [markThreadAsRead, loadMessages]);

  const handleSystemAction = useCallback((
    tid: string,
    action: "accept_request" | "decline_request" | "confirm_change" | "pay_now",
    payload?: { seats?: number; amount?: number }
  ) => {
    try {
      setError(null);
      const systemMap: Record<string, SystemEvent> = {
        accept_request: { kind: "request_accepted", byUser: meId, seats: payload?.seats ?? 1 },
        decline_request: { kind: "request_declined", byUser: meId },
        confirm_change: { kind: "change_confirmed", byUser: meId },
        pay_now: { kind: "payment_paid", amount: payload?.amount ?? 2.0, method: "MB Way" },
      };
      const system = systemMap[action];
      if (system) {
        addMessage(tid, { type: "system", system } as Omit<Message, "id" | "threadId" | "ts">);
      }
    } catch (err) {
      setError("Erro ao processar ação");
      console.error("Error handling system action:", err);
    }
  }, [meId, addMessage]);

  if (!user) {
    return (
      <main className="relative min-h-screen px-4 pb-32 flex flex-col items-center justify-center bg-white text-gray-900 overflow-hidden">
        <div className="text-4xl mb-4">💬</div>
        <p className="text-sm font-semibold text-gray-800 mb-1">As tuas mensagens aparecem aqui</p>
        <p className="text-xs text-gray-500 text-center">Inicia sessão para ver as tuas conversas com condutores e passageiros</p>
      </main>
    );
  }

  if (initialThreadId && !hasOpenedInitialThread.current && !openThreadId) {
    const thread = threads.find(t => t.id === initialThreadId);
    if (!thread) {
      return (
        <main className="relative min-h-screen px-4 pb-32 flex items-center justify-center bg-white text-gray-900 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-gray-300/8 blur-[180px]" />
            <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-purple-500/20 blur-[160px]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-200/15 blur-[200px]" />
          </div>
          <div className="relative z-10 text-center">
            <div className="text-sm text-gray-600">A carregar conversa...</div>
          </div>
        </main>
      );
    }
  }

  if (openThreadId) {
    const thread = threads.find(t => t.id === openThreadId);
    if (!thread) {
      setError("Conversa não encontrada");
      setOpenThreadId(null);
      return null;
    }
    return (
      <ThreadView
        meId={meId}
        thread={thread}
        messages={messagesByThread[openThreadId] || []}
        onBack={() => setOpenThreadId(null)}
        onSystemAction={(action, payload) => handleSystemAction(openThreadId, action, payload)}
        onSendMessage={(text) => sendMessage(openThreadId, text)}
        getUserName={(id) => {
          if (id === meId) return "Tu";
          return "Utilizador";
        }}
      />
    );
  }

  return (
    <main className="relative min-h-screen px-4 pb-32 bg-white text-gray-900 overflow-hidden" role="main" aria-label="Caixa de entrada">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-gray-300/5 blur-[180px]" />
        <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-purple-500/8 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-200/6 blur-[200px]" />
      </div>

      <div className="relative z-10">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-700 px-4 py-3 rounded mb-4" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <Section title="Pedidos" ariaLabel={`${sections.pedidos.length} pedidos de boleia`}>
          {isLoading && sections.pedidos.length === 0 && <LoadingRows />}
          {!isLoading && sections.pedidos.length === 0 && <Empty label="Sem pedidos" />}
          {sections.pedidos.map(t => (
            <InboxRow
              key={t.id}
              title={t.title}
              subtitle={summaryLast(t.lastEvent)}
              unread={t.unreadCount}
              cta={ctaFor(t.lastEvent)}
              onClick={() => openThread(t.id)}
            />
          ))}
        </Section>

        <Section title="Viagens" ariaLabel={`${sections.viagens.length} conversas de viagem`}>
          {isLoading && sections.viagens.length === 0 && <LoadingRows />}
          {!isLoading && sections.viagens.length === 0 && <Empty label="Sem conversas de viagem" />}
          {sections.viagens.map(t => (
            <InboxRow
              key={t.id}
              title={t.title}
              subtitle={summaryLast(t.lastEvent)}
              unread={t.unreadCount}
              onClick={() => openThread(t.id)}
            />
          ))}
        </Section>

        <Section title="Pessoas" ariaLabel={`${sections.pessoas.length} conversas privadas`}>
          {!isLoading && sections.pessoas.length === 0 && <Empty label="Sem DMs" />}
          {sections.pessoas.map(t => (
            <InboxRow
              key={t.id}
              title={t.title}
              subtitle={summaryLast(t.lastEvent)}
              unread={t.unreadCount}
              onClick={() => openThread(t.id)}
            />
          ))}
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children, ariaLabel }: { title: string; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <section className="pt-4 pb-6" aria-label={ariaLabel}>
      <h2 className="text-sm font-bold text-gray-900 mb-3">{title}</h2>
      <div className="grid gap-2" aria-label={`Lista de ${title.toLowerCase()}`}>
        {children}
      </div>
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-center text-gray-500 py-8 text-sm">{label}</div>;
}

function LoadingRows() {
  return (
    <>
      {[1, 2].map(i => (
        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </>
  );
}

function summaryLast(last?: Thread["lastEvent"]) {
  if (!last) return "";
  if (last.type === "text") return last.text;
  const s = last.system as SystemEvent;
  if (s.kind === "ride_request") return `Pedido de ${s.seats ?? 1} lugar`;
  if (s.kind === "request_accepted") return "Pedido aceite";
  if (s.kind === "request_declined") return "Pedido recusado";
  if (s.kind === "time_changed") return `Hora mudou para ${s.newTime}`;
  if (s.kind === "meeting_changed") return "Ponto de encontro atualizado";
  if (s.kind === "payment_due") return `Pagamento em falta €${s.amount?.toFixed(2)}`;
  if (s.kind === "payment_paid") return "Pagamento confirmado";
  if (s.kind === "change_confirmed") return "Alteração confirmada";
  return "Atualização";
}

function ctaFor(last?: Thread["lastEvent"]) {
  if (!last || last.type !== "system") return undefined;
  const k = (last.system as SystemEvent).kind;
  if (k === "ride_request") return "Aceitar?";
  if (k === "time_changed" || k === "meeting_changed") return "Confirmar";
  if (k === "payment_due") return "Pagar";
  return undefined;
}
