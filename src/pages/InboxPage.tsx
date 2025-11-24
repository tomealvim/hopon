import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useInbox } from "../contexts/InboxContext";
import type { Thread, Message, SystemEvent } from "./types/inbox";
import ThreadView from "../components/inbox/ThreadView";
import InboxRow from "../components/inbox/InboxRow";

// --- MOCK DATA --------------------------------------------------------------
const me = { id: "u_me", name: "Tu" };
const tomas = { id: "u_tomas", name: "Tomás Silva" };
const mafalda = { id: "u_mafalda", name: "Mafalda R." };

// --- PAGE -------------------------------------------------------------------
type InboxPageProps = {
  initialThreadId?: string;
  onThreadClosed?: () => void;
};

export default function InboxPage({ initialThreadId, onThreadClosed }: InboxPageProps = {}) {
  const { threads, messagesByThread, markThreadAsRead, addMessage } = useInbox();
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasOpenedInitialThread = useRef(false);
  
  // Resetar flag quando initialThreadId muda
  useEffect(() => {
    hasOpenedInitialThread.current = false;
  }, [initialThreadId]);

  // Abrir thread inicial assim que aparecer no array de threads
  useEffect(() => {
    if (initialThreadId && !hasOpenedInitialThread.current) {
      const thread = threads.find(t => t.id === initialThreadId);
      if (thread) {
        setOpenThreadId(initialThreadId);
        markThreadAsRead(initialThreadId);
        hasOpenedInitialThread.current = true;
        // Limpar após abrir
        onThreadClosed?.();
      }
    }
  }, [initialThreadId, threads, markThreadAsRead, onThreadClosed]);

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
    } catch (err) {
      setError("Erro ao abrir conversa");
      console.error("Error opening thread:", err);
    }
  }, [markThreadAsRead]);

  // Handlers de ações de sistema (mock: só atualizam estado local)
  const handleSystemAction = useCallback((
    tid: string,
    action: "accept_request" | "decline_request" | "confirm_change" | "pay_now",
    payload?: { seats?: number; amount?: number }
  ) => {
    try {
      setError(null);
      
      const createSystemMessage = (system: SystemEvent): Message => ({
        id: nid(),
        threadId: tid,
        type: "system",
        ts: Date.now(),
        system,
      });

      const updateThreads = (msg: Message) => {
        if (msg.type === "system") {
          addMessage(tid, { type: "system", system: msg.system } as Omit<Message, "id" | "threadId" | "ts">);
        } else {
          addMessage(tid, { type: "text", text: msg.text, authorId: msg.authorId } as Omit<Message, "id" | "threadId" | "ts">);
        }
      };

      switch (action) {
        case "accept_request": {
          const msg = createSystemMessage({ 
            kind: "request_accepted", 
            byUser: me.id, 
            seats: payload?.seats ?? 1 
          });
          updateThreads(msg);
          break;
        }
        case "decline_request": {
          const msg = createSystemMessage({ 
            kind: "request_declined", 
            byUser: me.id 
          });
          updateThreads(msg);
          break;
        }
        case "confirm_change": {
          const msg = createSystemMessage({ 
            kind: "change_confirmed", 
            byUser: me.id 
          });
          updateThreads(msg);
          break;
        }
        case "pay_now": {
          const msg = createSystemMessage({ 
            kind: "payment_paid", 
            amount: payload?.amount ?? 2.0, 
            method: "MB Way" 
          });
          updateThreads(msg);
          break;
        }
      }
    } catch (err) {
      setError("Erro ao processar ação");
      console.error("Error handling system action:", err);
    }
  }, [openThreadId]);

  // Se temos initialThreadId mas ainda não encontramos a thread, mostrar loading
  if (initialThreadId && !hasOpenedInitialThread.current && !openThreadId) {
    const thread = threads.find(t => t.id === initialThreadId);
    if (!thread) {
      return (
        <main className="relative min-h-screen px-4 pb-32 flex items-center justify-center text-white overflow-hidden">
          {/* Blur effects coloridos */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-pink-500/20 blur-[180px]" />
            <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-purple-500/20 blur-[160px]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-200/15 blur-[200px]" />
          </div>
          <div className="relative z-10 text-center">
            <div className="text-sm text-white/70">A carregar conversa...</div>
          </div>
        </main>
      );
    }
  }

  if (openThreadId) {
    const thread = threads.find(t => t.id === openThreadId);
    if (!thread) {
      // Thread foi removida ou não existe
      setError("Conversa não encontrada");
      setOpenThreadId(null);
      return null;
    }
    return (
      <ThreadView
        meId={me.id}
        thread={thread}
        messages={messagesByThread[openThreadId] || []}
        onBack={() => setOpenThreadId(null)}
        onSystemAction={(action, payload) => handleSystemAction(openThreadId, action, payload)}
        getUserName={(id) => {
          if (id === me.id) return me.name;
          if (id === tomas.id) return tomas.name;
          if (id === mafalda.id) return mafalda.name;
          return "Desconhecido";
        }}
      />
    );
  }

  return (
    <main className="relative min-h-screen px-4 pb-32 text-white overflow-hidden" role="main" aria-label="Caixa de entrada">
      {/* Blur effects coloridos */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-10 w-[28rem] h-[28rem] bg-pink-500/8 blur-[180px]" />
        <div className="absolute top-32 right-0 w-[24rem] h-[24rem] bg-purple-500/8 blur-[160px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] bg-amber-200/6 blur-[200px]" />
      </div>
      
      <div className="relative z-10">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded mb-4" role="alert" aria-live="polite">
          {error}
        </div>
      )}
      
      {/* Pedidos */}
      <Section title="Pedidos" ariaLabel={`${sections.pedidos.length} pedidos de boleia`}>
        {sections.pedidos.length === 0 && <Empty label="Sem pedidos" />}
        {/* TODO: Quando houver API real, adicionar loading state: {isLoading ? Array(3).fill(0).map((_, i) => <InboxRowSkeleton key={i} />) : ...} */}
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

      {/* Viagens */}
      <Section title="Viagens" ariaLabel={`${sections.viagens.length} conversas de viagem`}>
        {sections.viagens.length === 0 && <Empty label="Sem conversas de viagem" />}
        {/* TODO: Quando houver API real, adicionar loading state */}
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

      {/* Pessoas */}
      <Section title="Pessoas" ariaLabel={`${sections.pessoas.length} conversas privadas`}>
        {sections.pessoas.length === 0 && <Empty label="Sem DMs" />}
        {/* TODO: Quando houver API real, adicionar loading state */}
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

// --- UI bits ----------------------------------------------------------------
function Section({ 
  title, 
  children, 
  ariaLabel 
}: { 
  title: string; 
  children: React.ReactNode; 
  ariaLabel?: string;
}) {
  return (
    <section className="pt-4 pb-6" aria-label={ariaLabel}>
      <h2 className="text-sm font-bold text-white mb-3">{title}</h2>
      <div className="grid gap-2" aria-label={`Lista de ${title.toLowerCase()}`}>
        {children}
      </div>
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-center text-white/50 py-8 text-sm">{label}</div>;
}


// --- Helpers ----------------------------------------------------------------
function nid() {
  return Math.random().toString(36).slice(2, 10);
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
