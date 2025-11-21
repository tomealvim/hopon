import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastProps = {
  toast: Toast;
  onRemove: (id: string) => void;
};

export default function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animar entrada
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-remover após duração
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300); // Aguardar animação de saída
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  };

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 max-w-sm w-full bg-white border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out",
        getStyles(),
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0" aria-hidden="true">
          {getIcon()}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{toast.title}</h4>
          {toast.message && (
            <p className="text-sm mt-1 opacity-90">{toast.message}</p>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-lg hover:opacity-70 transition-opacity"
          aria-label="Fechar notificação"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Container para múltiplas notificações
export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

