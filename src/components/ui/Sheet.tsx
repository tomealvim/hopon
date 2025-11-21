import { useEffect } from "react";
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
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={cn("sheet", !open && "sheet-hidden")}>
      {/* fundo */}
      <div
        className={cn("sheet-backdrop", open ? "sheet-backdrop--open" : "sheet-backdrop--closed")}
        onClick={onClose}
      />
      {/* painel */}
      <div
        className={cn("sheet-panel", open ? "sheet-panel--open" : "sheet-panel--closed", heightClass[height])}
      >
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h3 className="sheet-title">{title}</h3>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/10 text-white" aria-label="Fechar">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export default Sheet;
export { Sheet };
