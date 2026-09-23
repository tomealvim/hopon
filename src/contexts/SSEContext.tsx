/**
 * SSEContext - ligação Server-Sent Events partilhada por toda a app.
 *
 * Mantém uma única ligação SSE por sessão autenticada.
 * Outros contextos (InboxContext, etc.) subscrevem eventos específicos via useSSE().
 * Reconecta automaticamente após 5s em caso de erro.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const STORAGE_KEY_TOKEN = "hopon_token";
const RECONNECT_DELAY_MS = 5_000;

type EventHandler = (data: Record<string, unknown>) => void;

interface SSEContextValue {
  /** Subscrever a um tipo de evento. Retorna função para cancelar. */
  subscribe: (eventType: string, handler: EventHandler) => () => void;
  /** true quando a ligação SSE está activa */
  connected: boolean;
}

const SSEContext = createContext<SSEContextValue>({
  subscribe: () => () => {},
  connected: false,
});

export function SSEProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    const connect = () => {
      const token = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (!token) return; // não autenticado, não ligar

      const url = `${API_URL}/events/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data) as Record<string, unknown>;
          const type = payload.type as string;
          if (type === "ping") return; // ignorar keep-alive
          const handlers = listenersRef.current.get(type);
          handlers?.forEach((h) => h(payload));
        } catch {
          // ignorar mensagens malformadas
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;
        if (activeRef.current) {
          timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, []); // ligação única por montagem - token lido dinamicamente em cada connect()

  const subscribe = useCallback(
    (eventType: string, handler: EventHandler): (() => void) => {
      if (!listenersRef.current.has(eventType)) {
        listenersRef.current.set(eventType, new Set());
      }
      listenersRef.current.get(eventType)!.add(handler);
      return () => {
        listenersRef.current.get(eventType)?.delete(handler);
      };
    },
    [],
  );

  return (
    <SSEContext.Provider value={{ subscribe, connected }}>
      {children}
    </SSEContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSSE() {
  return useContext(SSEContext);
}
