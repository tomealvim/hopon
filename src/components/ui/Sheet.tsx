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
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; dragging: boolean } | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setDragY(0);
  }, [open]);

  // Bloquear scroll do fundo quando a sheet está aberta
  useEffect(() => {
    if (open) {
      document.body.classList.add("sheet-open");
    } else {
      document.body.classList.remove("sheet-open");
    }
    return () => document.body.classList.remove("sheet-open");
  }, [open]);

  // Swipe-to-close a partir do corpo da sheet (quando conteúdo está no topo)
  useEffect(() => {
    if (!open) return;
    const bodyEl = bodyRef.current;
    if (!bodyEl) return;

    let startY = 0;
    let active = false;
    let currentDragY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      active = false;
      currentDragY = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const delta = e.touches[0].clientY - startY;
      if (!active) {
        // Só ativa se o conteúdo está no topo e o gesto é claramente para baixo
        if (bodyEl.scrollTop <= 0 && delta > 10) {
          active = true;
        } else {
          return;
        }
      }
      e.preventDefault();
      currentDragY = Math.max(0, delta);
      setDragY(currentDragY);
    };

    const onTouchEnd = () => {
      if (active && currentDragY > 120) {
        onClose();
      } else {
        setDragY(0);
      }
      active = false;
      currentDragY = 0;
    };

    bodyEl.addEventListener("touchstart", onTouchStart, { passive: true });
    bodyEl.addEventListener("touchmove", onTouchMove, { passive: false });
    bodyEl.addEventListener("touchend", onTouchEnd);

    return () => {
      bodyEl.removeEventListener("touchstart", onTouchStart);
      bodyEl.removeEventListener("touchmove", onTouchMove);
      bodyEl.removeEventListener("touchend", onTouchEnd);
    };
  }, [open, onClose]);

  // Drag pelo handle e cabeçalho (pointer events)
  function onPointerDown(e: React.PointerEvent) {
    dragState.current = { startY: e.clientY, dragging: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current?.dragging) return;
    const delta = e.clientY - dragState.current.startY;
    setDragY(Math.max(0, delta));
  }

  function onPointerUp() {
    if (!dragState.current) return;
    if (dragY > 120) onClose();
    dragState.current = null;
    setDragY(0);
  }

  const panelStyle = dragY > 0
    ? { transform: `translate(-50%, ${dragY}px)`, transition: "none" }
    : undefined;

  return (
    <div className={cn("sheet", !open && "sheet-hidden")}>
      <div
        className={cn("sheet-backdrop", open ? "sheet-backdrop--open" : "sheet-backdrop--closed")}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn("sheet-panel", open ? "sheet-panel--open" : "sheet-panel--closed", heightClass[height])}
        style={panelStyle}
      >
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
        </div>
        <div ref={bodyRef} className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export default Sheet;
export { Sheet };
