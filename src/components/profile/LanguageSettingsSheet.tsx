import { Button } from "../ui/Button";
import Sheet from "../ui/Sheet";
import { LANGUAGE_OPTIONS, type LanguageCode } from "../../data/languages";

type LanguageSettingsSheetProps = {
  open: boolean;
  current: LanguageCode;
  selected: LanguageCode;
  onSelect: (code: LanguageCode) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function LanguageSettingsSheet({
  open,
  current,
  selected,
  onSelect,
  onClose,
  onSave,
}: LanguageSettingsSheetProps) {
  const canSave = selected !== current;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Idioma da app"
      height="md"
      footer={
<Button
        block
        variant="outline"
        className="min-h-[48px]"
        disabled={!canSave}
        onClick={onSave}
      >
        Guardar idioma
      </Button>
      }
    >
      <div className="space-y-4">
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
                className={`w-full rounded-3xl border-2 bg-gray-50 px-4 py-4 flex items-center justify-between gap-3 text-left transition ${
                  isActive ? "border-gray-900 shadow-sm bg-gray-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl" aria-hidden>
                    {option.flag}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-600">{option.nativeLabel}</p>
                  </div>
                </div>

                <span
                  aria-hidden
                  className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                    isActive ? "bg-gray-900 border-gray-900 text-white" : "border-gray-300 text-transparent"
                  }`}
                >
                  <CheckIcon />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

