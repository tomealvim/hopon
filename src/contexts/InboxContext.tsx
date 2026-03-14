import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Thread, Message, SystemEvent } from "../pages/types/inbox";
import { apiRequest } from "../services/api";
import { useAuth } from "./AuthContext";
import { useSSE } from "./SSEContext";

interface ApiParticipant {
  userId: string;
  name: string;
  avatarUrl: string | null;
  lastReadAt: string | null;
}

interface ApiMessage {
  id: string;
  conversationId: string;
  type: string;
  body: string;
  metadata: SystemEvent | null;
  sender: { id: string; name: string; avatarUrl: string | null };
  createdAt: string;
}

interface ApiConversation {
  id: string;
  rideId: string | null;
  bookingId: string | null;
  ride: { id: string; origin: string; destination: string; departureTime: string } | null;
  participants: ApiParticipant[];
  lastMessage: ApiMessage | null;
  hasUnread: boolean;
  createdAt: string;
  updatedAt: string;
}

function apiConversationToThread(conv: ApiConversation): Thread {
  const lastMsg = conv.lastMessage;
  let lastEvent: Thread["lastEvent"] | undefined;
  if (lastMsg) {
    if (lastMsg.type === "system" && lastMsg.metadata) {
      lastEvent = { type: "system", system: lastMsg.metadata };
    } else {
      lastEvent = { type: "text", text: lastMsg.body };
    }
  }
  const isGroup = !!conv.rideId && !conv.bookingId;
  const rideLabel = conv.ride
    ? `${conv.ride.origin} → ${conv.ride.destination}`
    : "Boleia";
  return {
    id: conv.id,
    kind: "ride",
    title: isGroup ? `Grupo - ${rideLabel}` : rideLabel,
    participants: conv.participants.map((p) => p.userId),
    unreadCount: conv.hasUnread ? 1 : 0,
    lastEvent,
    meta: conv.ride
      ? { date: new Date(conv.ride.departureTime).toLocaleDateString("pt-PT") }
      : undefined,
    rideId: conv.rideId ?? undefined,
    isGroup,
  };
}

function apiMessageToMessage(msg: ApiMessage): Message {
  if (msg.type === "system" && msg.metadata) {
    return {
      id: msg.id,
      threadId: msg.conversationId,
      type: "system",
      ts: new Date(msg.createdAt).getTime(),
      system: msg.metadata,
    };
  }
  return {
    id: msg.id,
    threadId: msg.conversationId,
    type: "text",
    authorId: msg.sender.id,
    text: msg.body,
    ts: new Date(msg.createdAt).getTime(),
  };
}

export interface InboxContextValue {
  threads: Thread[];
  messagesByThread: Record<string, Message[]>;
  isLoading: boolean;
  sendMessage: (threadId: string, text: string) => Promise<void>;
  markThreadAsRead: (threadId: string) => void;
  getThread: (threadId: string) => Thread | undefined;
  getGroupThreadByRideId: (rideId: string) => Thread | undefined;
  getMessages: (threadId: string) => Message[];
  loadMessages: (threadId: string) => Promise<void>;
  refresh: () => Promise<void>;
  addMessage: (threadId: string, message: Omit<Message, "id" | "threadId" | "ts">) => void;
}

const InboxContext = createContext<InboxContextValue | undefined>(undefined);

// SSE fornece updates instantâneos; polling é apenas fallback de segurança
const POLL_INTERVAL = 60_000;

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribe } = useSSE();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiRequest<ApiConversation[]>("/inbox/conversations");
      setThreads(data.map(apiConversationToThread));
    } catch {
      // ignorar silenciosamente no poll de background
    }
  }, [user]);

  // Polling de fallback (60s) — SSE é o canal principal
  useEffect(() => {
    if (!user) {
      setThreads([]);
      setMessagesByThread({});
      return;
    }
    setIsLoading(true);
    fetchConversations().finally(() => setIsLoading(false));
    pollRef.current = setInterval(fetchConversations, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, fetchConversations]);

  // SSE — nova mensagem recebida em tempo real
  useEffect(() => {
    return subscribe("message.new", (data) => {
      const conversationId = data.conversationId as string;
      const msg = data.message as ApiMessage;
      if (!conversationId || !msg) return;

      const newMessage = apiMessageToMessage(msg);

      // Adicionar mensagem à conversa se já estiver carregada
      setMessagesByThread((prev) => {
        if (!prev[conversationId]) return prev; // conversa não aberta, ignorar
        // Deduplicar — pode ter chegado via POST + SSE
        const existing = prev[conversationId];
        if (existing.some((m) => m.id === newMessage.id)) return prev;
        return { ...prev, [conversationId]: [...existing, newMessage] };
      });

      // Atualizar lastEvent e marcar como não lido na lista de conversas
      setThreads((prev) =>
        prev.map((t) =>
          t.id === conversationId
            ? {
                ...t,
                unreadCount: (t.unreadCount ?? 0) + 1,
                lastEvent: { type: "text", text: msg.body },
              }
            : t,
        ),
      );
    });
  }, [subscribe]);

  const loadMessages = useCallback(async (threadId: string) => {
    if (!user) return;
    try {
      const data = await apiRequest<ApiMessage[]>(`/inbox/conversations/${threadId}/messages`);
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: data.map(apiMessageToMessage),
      }));
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
      );
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, [user]);

  const sendMessage = useCallback(async (threadId: string, text: string) => {
    if (!user || !text.trim()) return;
    const msg = await apiRequest<ApiMessage>(`/inbox/conversations/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: text.trim() }),
    });
    const newMessage = apiMessageToMessage(msg);
    setMessagesByThread((prev) => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), newMessage],
    }));
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, lastEvent: { type: "text", text: text.trim() } } : t
      )
    );
  }, [user]);

  const markThreadAsRead = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
    );
    apiRequest(`/inbox/conversations/${threadId}/read`, { method: "POST" }).catch(() => {});
  }, []);

  const getThread = useCallback(
    (threadId: string) => threads.find((t) => t.id === threadId),
    [threads]
  );

  const getGroupThreadByRideId = useCallback(
    (rideId: string) => threads.find((t) => t.isGroup && t.rideId === rideId),
    [threads]
  );

  const getMessages = useCallback(
    (threadId: string) => messagesByThread[threadId] ?? [],
    [messagesByThread]
  );

  const addMessage = useCallback(
    (threadId: string, message: Omit<Message, "id" | "threadId" | "ts">) => {
      const newMessage: Message = {
        ...message,
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        threadId,
        ts: Date.now(),
      } as Message;
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [...(prev[threadId] ?? []), newMessage],
      }));
    },
    []
  );

  const refresh = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  const value = useMemo(
    () => ({
      threads,
      messagesByThread,
      isLoading,
      sendMessage,
      markThreadAsRead,
      getThread,
      getGroupThreadByRideId,
      getMessages,
      loadMessages,
      refresh,
      addMessage,
    }),
    [threads, messagesByThread, isLoading, sendMessage, markThreadAsRead, getThread, getGroupThreadByRideId, getMessages, loadMessages, refresh, addMessage]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error("useInbox deve ser usado dentro de InboxProvider");
  }
  return context;
}
