import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { Thread, Message, SystemEvent } from "../pages/types/inbox";

export type { SystemEvent };

interface InboxContextValue {
  threads: Thread[];
  messagesByThread: Record<string, Message[]>;
  createThread: (thread: Omit<Thread, "id">) => Thread;
  addMessage: (threadId: string, message: Omit<Message, "id" | "threadId" | "ts">) => void;
  markThreadAsRead: (threadId: string) => void;
  getThread: (threadId: string) => Thread | undefined;
  getMessages: (threadId: string) => Message[];
}

const InboxContext = createContext<InboxContextValue | undefined>(undefined);

const STORAGE_KEY_THREADS = "hopon_threads";
const STORAGE_KEY_MESSAGES = "hopon_messages";

export function InboxProvider({ children }: { children: ReactNode }) {
  // Carregar threads do localStorage
  const [threads, setThreads] = useState<Thread[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_THREADS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Carregar mensagens do localStorage
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MESSAGES);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Guardar threads no localStorage
  const saveThreads = useCallback((newThreads: Thread[]) => {
    setThreads(newThreads);
    localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(newThreads));
  }, []);

  // Guardar mensagens no localStorage
  const saveMessages = useCallback((newMessages: Record<string, Message[]>) => {
    setMessagesByThread(newMessages);
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(newMessages));
  }, []);

  // Criar nova thread
  const createThread = useCallback((thread: Omit<Thread, "id">): Thread => {
    const newThread: Thread = {
      ...thread,
      id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };

    saveThreads([...threads, newThread]);
    return newThread;
  }, [threads, saveThreads]);

  // Adicionar mensagem a uma thread
  const addMessage = useCallback((threadId: string, message: Omit<Message, "id" | "threadId" | "ts">) => {
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      threadId,
      ts: Date.now(),
    } as Message;

    const currentMessages = messagesByThread[threadId] || [];
    const updatedMessages = { ...messagesByThread, [threadId]: [...currentMessages, newMessage] };
    
    saveMessages(updatedMessages);

    // Atualizar lastEvent da thread
    const updatedThreads = threads.map(t => {
      if (t.id !== threadId) return t;
      
      const lastEvent = message.type === "system" 
        ? { type: "system" as const, system: (message as { type: "system"; system: SystemEvent }).system }
        : { type: "text" as const, text: (message as { type: "text"; text: string }).text };
      
      return {
        ...t,
        lastEvent,
        unreadCount: t.unreadCount + 1
      };
    });
    saveThreads(updatedThreads);
  }, [threads, messagesByThread, saveMessages, saveThreads]);

  // Marcar thread como lida
  const markThreadAsRead = useCallback((threadId: string) => {
    const updatedThreads = threads.map(t => 
      t.id === threadId ? { ...t, unreadCount: 0 } : t
    );
    saveThreads(updatedThreads);
  }, [threads, saveThreads]);

  // Obter thread por ID
  const getThread = useCallback((threadId: string) => {
    return threads.find(t => t.id === threadId);
  }, [threads]);

  // Obter mensagens por thread ID
  const getMessages = useCallback((threadId: string) => {
    return messagesByThread[threadId] || [];
  }, [messagesByThread]);

  const value = useMemo(() => ({
    threads,
    messagesByThread,
    createThread,
    addMessage,
    markThreadAsRead,
    getThread,
    getMessages,
  }), [
    threads,
    messagesByThread,
    createThread,
    addMessage,
    markThreadAsRead,
    getThread,
    getMessages,
  ]);

  return (
    <InboxContext.Provider value={value}>
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error("useInbox deve ser usado dentro de InboxProvider");
  }
  return context;
}

