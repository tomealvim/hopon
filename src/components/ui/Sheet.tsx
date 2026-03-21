import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";

type Altura = "auto" | "md" | "lg";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  height?: Altura;
};

const heightClass: Record<Altura, string> = {
  auto: "sheet--auto",
  md:   "sheet--md",
  lg:   "sheet--lg",
};

function Sheet({ open, onClose, title, children, footer, height = "md" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; dragging: boolean } | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Reset drag offset when sheet opens/closes
  useEffect(() => {
    setDragY(0);
  }, [open]);

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { startY: e.clientY, dragging: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current?.dragging) return;
    const delta = e.clientY - dragState.current.startY;
    setDragY(Math.max(0, delta)); // só deixa arrastar para baixo
  }

  function onPointerUp() {
    if (!dragState.current) return;
    const threshold = 120;
    if (dragY > threshold) {
      onClose();
    }
    dragState.current = null;
    setDragY(0);
  }

  const panelStyle = dragY > 0
    ? { transform: `translate(-50%, ${dragY}px)`, transition: "none" }
    : undefined;

  return (
    <div className={cn("sheet", !open && "sheet-hidden")}>
      {/* fundo */}
      <div
        className={cn("sheet-backdrop", open ? "sheet-backdrop--open" : "sheet-backdrop--closed")}
        onClick={onClose}
      />
      {/* painel */}
      <div
        ref={panelRef}
        className={cn("sheet-panel", open ? "sheet-panel--open" : "sheet-panel--closed", heightClass[height])}
        style={panelStyle}
      >
        {/* handle — zona de drag */}
        <div
          className="sheet-handle cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <div
          className="sheet-head cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <h3 className="sheet-title">{title}</h3>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-xl p-2 hover:bg-gray-100 text-gray-900"
            aria-label="Fechar"
          >✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export default Sheet;
export { Sheet };
