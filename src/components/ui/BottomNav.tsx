import { cn } from "../../utils/cn";

export type TabKey = "discover" | "rides" | "inbox" | "profile";

export type BottomNavProps = {
  current: TabKey;
  onChange: (k: TabKey) => void;
  onPlus?: () => void;
};

function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill={active ? "currentColor" : "none"}/>
    </svg>
  );
}

function CarIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17m-2 0a2 2 0 104 0 2 2 0 10-4 0M17 17m-2 0a2 2 0 104 0 2 2 0 10-4 0M5 17H3V11L7 5h10l4 6v6h-2"/>
      <path d="M5 11h14"/>
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        fill={active ? "currentColor" : "none"} stroke="currentColor"/>
    </svg>
  );
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4" fill={active ? "currentColor" : "none"}/>
    </svg>
  );
}

const tabs: { key: TabKey; label: string; Icon: React.FC<{ active: boolean }> }[] = [
  { key: "discover", label: "Explorar", Icon: ExploreIcon },
  { key: "rides",    label: "Boleias",  Icon: CarIcon },
  { key: "inbox",    label: "Mensagens", Icon: ChatIcon },
  { key: "profile",  label: "Perfil",   Icon: PersonIcon },
];

import React from "react";

export default function BottomNav({ current, onChange, onPlus }: BottomNavProps) {
  const isActive = (tab: TabKey) => current === tab;

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Navegação inferior"
    >
      <div className="mx-auto max-w-mobile grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center h-16 px-2 md:max-w-tablet lg:max-w-desktop">
        {tabs.slice(0, 2).map(({ key, label, Icon }) => (
          <button
            key={key}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 h-14 w-full transition-all duration-200",
              isActive(key) ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
            )}
            onClick={() => onChange(key)}
            aria-label={label}
          >
            <Icon active={isActive(key)} />
            <span className={cn(
              "text-[10px] font-medium leading-none",
              isActive(key) && "font-semibold"
            )}>
              {label}
            </span>
            {isActive(key) && (
              <span className="w-1 h-1 rounded-full bg-gray-900 mt-0.5" />
            )}
          </button>
        ))}

        {/* FAB central */}
        <button
          className="relative -top-3 h-14 w-14 rounded-full bg-gray-900 text-white inline-flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-gray-700 active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-gray-900 focus-visible:outline-offset-2"
          aria-label="Adicionar"
          onClick={() => onPlus?.()}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>

        {tabs.slice(2).map(({ key, label, Icon }) => (
          <button
            key={key}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 h-14 w-full transition-all duration-200",
              isActive(key) ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
            )}
            onClick={() => onChange(key)}
            aria-label={label}
          >
            <Icon active={isActive(key)} />
            <span className={cn(
              "text-[10px] font-medium leading-none",
              isActive(key) && "font-semibold"
            )}>
              {label}
            </span>
            {isActive(key) && (
              <span className="w-1 h-1 rounded-full bg-gray-900 mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
