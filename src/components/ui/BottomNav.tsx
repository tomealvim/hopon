import React from "react";
import { cn } from "../../utils/cn";

export type TabKey = "discover" | "rides" | "inbox" | "profile";

export type BottomNavProps = {
  current: TabKey;
  onChange: (k: TabKey) => void;
  onPlus?: () => void;
};

type NavItem = { key: TabKey; label: string; icon: string };

const NAV_ITEMS: NavItem[] = [
  { key: "discover", label: "Explorar",  icon: "explore" },
  { key: "rides",    label: "Boleias",   icon: "directions_car" },
  { key: "inbox",    label: "Mensagens", icon: "message" },
  { key: "profile",  label: "Perfil",    icon: "person" },
];

const FILLED: React.CSSProperties = {
  fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
};

export default function BottomNav({ current, onChange, onPlus }: BottomNavProps) {
  return (
    <>
      <div className="bottom-nav-fill" aria-hidden />
      <nav className="bottom-nav-safe" role="navigation" aria-label="Navegacao inferior">
        <div className="mx-auto max-w-mobile grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center h-16 px-3 md:max-w-tablet lg:max-w-desktop">

          {/* Tabs 1 e 2 */}
          {NAV_ITEMS.slice(0, 2).map(({ key, label, icon }) => {
            const active = current === key;
            return (
              <button
                key={key}
                onClick={() => onChange(key)}
                aria-label={label}
                className="flex flex-col items-center justify-center gap-0.5 h-full w-full active:scale-90 transition-transform duration-200"
              >
                <span
                  className={cn("material-symbols-outlined text-2xl transition-colors", active ? "text-[#52B788]" : "text-[#1B4332]/40")}
                  style={active ? FILLED : undefined}
                >
                  {icon}
                </span>
                <span className={cn("text-[10px] leading-none font-manrope transition-colors", active ? "font-bold text-[#52B788]" : "font-medium text-[#1B4332]/40")}>
                  {label}
                </span>
              </button>
            );
          })}

          {/* FAB central */}
          <button
            onClick={() => onPlus?.()}
            aria-label="Publicar boleia"
            className="relative -top-3 flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-transform duration-200 focus-visible:outline-none"
          >
            <span
              className="material-symbols-outlined text-[#52B788]"
              style={{ fontSize: "40px", fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 40" }}
            >
              add_circle
            </span>
            <span className="text-[10px] font-medium text-[#1B4332]/40 font-manrope">Postar</span>
          </button>

          {/* Tabs 3 e 4 */}
          {NAV_ITEMS.slice(2).map(({ key, label, icon }) => {
            const active = current === key;
            return (
              <button
                key={key}
                onClick={() => onChange(key)}
                aria-label={label}
                className="flex flex-col items-center justify-center gap-0.5 h-full w-full active:scale-90 transition-transform duration-200"
              >
                <span
                  className={cn("material-symbols-outlined text-2xl transition-colors", active ? "text-[#52B788]" : "text-[#1B4332]/40")}
                  style={active ? FILLED : undefined}
                >
                  {icon}
                </span>
                <span className={cn("text-[10px] leading-none font-manrope transition-colors", active ? "font-bold text-[#52B788]" : "font-medium text-[#1B4332]/40")}>
                  {label}
                </span>
              </button>
            );
          })}

        </div>
      </nav>
    </>
  );
}
