export const LANGUAGE_OPTIONS = [
  {
    id: "pt",
    label: "Português",
    nativeLabel: "Português (Portugal)",
    flag: "🇵🇹",
  },
  {
    id: "en",
    label: "Inglês",
    nativeLabel: "English",
    flag: "🇺🇸",
  },
  {
    id: "fr",
    label: "Francês",
    nativeLabel: "Français",
    flag: "🇫🇷",
  },
  {
    id: "de",
    label: "Alemão",
    nativeLabel: "Deutsch",
    flag: "🇩🇪",
  },
] as const;

export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];
export type LanguageCode = LanguageOption["id"];

