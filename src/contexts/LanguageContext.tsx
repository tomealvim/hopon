import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { LANGUAGE_OPTIONS, type LanguageCode } from "../data/languages";

export type { LanguageCode };

const LANGUAGE_STORAGE_KEY = "hopon.language";

function isLanguageCode(value: string | null): value is LanguageCode {
  if (!value) return false;
  return LANGUAGE_OPTIONS.some(option => option.id === value);
}

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  getLanguageLabel: (code: LanguageCode) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") return "pt";
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageCode(stored) ? stored : "pt";
  });

  // Aplicar idioma ao documento HTML
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Guardar no localStorage quando muda
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  const setLanguage = (code: LanguageCode) => {
    setLanguageState(code);
  };

  const getLanguageLabel = (code: LanguageCode): string => {
    const option = LANGUAGE_OPTIONS.find(opt => opt.id === code);
    return option?.label ?? "Português";
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, getLanguageLabel }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

