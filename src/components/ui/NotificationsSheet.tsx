import { useAppNotifications, type AppNotification } from "../../contexts/AppNotificationsContext";
import Sheet from "./Sheet";
import { cn } from "../../utils/cn";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function NotifIcon({ type }: { type: string }) {
  if (type.startsWith("booking")) return <span className="text-base">🎫</span>;
  if (type.startsWith("message")) return <span className="text-base">💬</span>;
  if (type.startsWith("ride")) return <span className="text-base">🚗</span>;
  return <span className="text-base">🔔</span>;
}

function NotifRow({ notif, onRead }: { notif: AppNotification; onRead: (id: string) => void }) {
  return (
    <button
      className={cn(
        "w-full text-left flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition",
        !notif.read && "bg-blue-50/60",
      )}
      onClick={() => !notif.read && onRead(notif.id)}
    >
      <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
        <NotifIcon type={notif.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium text-gray-900 truncate", !notif.read && "font-semibold")}>
            {notif.title}
          </p>
          {!notif.read && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />}
        </div>
        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.body}</p>
        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
      </div>
    </button>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsSheet({ open, onClose }: Props) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useAppNotifications();

  return (
    <Sheet open={open} onClose={onClose} title="Notificações" height="lg" footer={null}>
      <div className="flex flex-col h-full">
        {unreadCount > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 flex justify-end">
            <button
              className="text-xs text-blue-600 font-medium hover:underline"
              onClick={markAllRead}
            >
              Marcar todas como lidas
            </button>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            A carregar…
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6 py-12">
            <span className="text-4xl">🔔</span>
            <p className="text-sm font-medium text-gray-700">Sem notificações</p>
            <p className="text-xs text-gray-400">Quando tiveres novas reservas ou mensagens, aparecerão aqui.</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            {notifications.map((n) => (
              <NotifRow key={n.id} notif={n} onRead={markRead} />
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
