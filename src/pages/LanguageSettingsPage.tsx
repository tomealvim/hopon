import { Button } from "../components/ui/Button";
import { LANGUAGE_OPTIONS, type LanguageCode } from "../data/languages";

type LanguageSettingsPageProps = {
  current: LanguageCode;
  selected: LanguageCode;
  onSelect: (code: LanguageCode) => void;
  onBack: () => void;
  onSave: () => void;
};

export default function LanguageSettingsPage({
  current,
  selected,
  onSelect,
  onBack,
  onSave,
}: LanguageSettingsPageProps) {
  const canSave = selected !== current;

  return (
    <div className="min-h-screen bg-[#F7F7F9] pb-28">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="h-14 flex items-center gap-3 px-4">
          <button
            type="button"
            aria-label="Voltar"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <ArrowLeftIcon />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">Ajuda & Qualidade</p>
            <h1 className="text-base font-semibold text-gray-900">Idioma da app</h1>
          </div>
        </div>
      </header>

      <section className="px-4 pt-4 space-y-4">
        <p className="text-sm text-gray-600">
          Escolhe o idioma principal da interface. Por agora, só suportamos as opções abaixo.
        </p>

        <div className="space-y-3">
          {LANGUAGE_OPTIONS.map(option => {
            const isActive = option.id === selected;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                aria-pressed={isActive}
                className={`w-full rounded-3xl border-2 bg-white px-4 py-4 flex items-center justify-between gap-3 text-left shadow-sm transition ${
                  isActive ? "border-primary shadow-primary/10" : "border-transparent hover:border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl" aria-hidden>
                    {option.flag}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.nativeLabel}</p>
                  </div>
                </div>

                <span
                  aria-hidden
                  className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                    isActive ? "bg-primary border-primary text-white" : "border-gray-200 text-transparent"
                  }`}
                >
                  <CheckIcon />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="px-4 py-6 mt-6">
        <Button
          block
          className="min-h-[48px]"
          disabled={!canSave}
          onClick={onSave}
        >
          Guardar idioma
        </Button>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

