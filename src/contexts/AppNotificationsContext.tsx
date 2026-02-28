import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiRequest } from "../services/api";
import { useSSE } from "./SSEContext";
import { useNotifications } from "./NotificationContext";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

interface AppNotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AppNotificationsContext = createContext<AppNotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markRead: async () => {},
  markAllRead: async () => {},
  refresh: async () => {},
});

export function AppNotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const { subscribe } = useSSE();
  const { showInfo } = useNotifications();
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest<AppNotification[]>("/notifications");
      setNotifications(data);
    } catch {
      // silenciar falhas de rede
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Escutar eventos SSE de nova notificação
  useEffect(() => {
    return subscribe("notification.new", (data) => {
      const notif: AppNotification = {
        id: data.id as string,
        type: data.type as string,
        title: data.title as string,
        body: data.body as string,
        metadata: (data.metadata as Record<string, unknown>) ?? null,
        read: false,
        createdAt: data.createdAt as string,
      };

      setNotifications((prev) => [notif, ...prev]);

      // Mostrar toast subtil
      showInfo(notif.title, notif.body);
    });
  }, [subscribe, showInfo]);

  const markRead = useCallback(async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      // ignorar
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignorar
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppNotificationsContext.Provider
      value={{ notifications, unreadCount, loading, markRead, markAllRead, refresh }}
    >
      {children}
    </AppNotificationsContext.Provider>
  );
}

export function useAppNotifications() {
  return useContext(AppNotificationsContext);
}
