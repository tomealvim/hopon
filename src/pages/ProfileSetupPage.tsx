import { useState } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import AppName from "../components/ui/AppName";
import Sheet from "../components/ui/Sheet";
import ImageUpload from "../components/ui/ImageUpload";
import { LocationInput, type LocationValue } from "../components/ui/LocationInput";

type Step = 1 | 2 | 3 | 4;

const STEP_CONFIG: Record<Step, { eyebrow: string; title: string; subtitle: string }> = {
  1: {
    eyebrow: "Identidade",
    title: "Como te chamamos?",
    subtitle: "O teu nome e foto aparecem nas boleias e no chat.",
  },
  2: {
    eyebrow: "Contacto",
    title: "O teu número",
    subtitle: "Usado para confirmações e alertas de viagem.",
  },
  3: {
    eyebrow: "Localização",
    title: "Onde é a tua casa?",
    subtitle: "Usamos para te sugerir boleias perto de ti. Não partilhamos a morada exacta com ninguém.",
  },
  4: {
    eyebrow: "Pronto",
    title: "Tudo certo!",
    subtitle: "Confirma os teus dados antes de entrar.",
  },
};

export default function ProfileSetupPage() {
  const { updateProfile } = useAuth();
  const { showError } = useNotifications();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);

  // Step 2
  const [phone, setPhone] = useState<string>("");
  const [country, setCountry] = useState<Country>("PT");

  // Step 3
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLat, setHomeLat] = useState<number | undefined>();
  const [homeLng, setHomeLng] = useState<number | undefined>();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  const meta = STEP_CONFIG[step];
  const isLast = step === 4;

  function canAdvance() {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return phone.trim().length > 4;
    if (step === 3) return homeLat != null && homeLng != null;
    return true;
  }

  function handleNext() {
    if (step === 1 && !name.trim()) {
      showError("Campo obrigatório", "Indica o teu nome.");
      return;
    }
    if (step === 2 && !phone.trim()) {
      showError("Campo obrigatório", "Indica o teu número de telemóvel.");
      return;
    }
    if (step === 3 && (homeLat == null || homeLng == null)) {
      showError("Localização necessária", "Usa a localização atual ou seleciona uma morada da lista.");
      return;
    }
    if (step < 4) setStep((step + 1) as Step);
  }

  function handleBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  async function handleFinish() {
    setSaving(true);
    setSaveError("");
    try {
      await updateProfile({
        name: name.trim(),
        avatarUrl: avatarUrl || undefined,
        phone: phone.trim(),
        homeAddress: homeAddress.trim(),
        homeLat,
        homeLng,
        setupCompleted: true,
      });
    } catch (err: any) {
      setSaveError(err?.message ?? "Erro ao guardar perfil. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[100svh] bg-white flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-gray-900 transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <button
          type="button"
          onClick={handleBack}
          className={step === 1 ? "invisible" : "w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"}
          aria-label="Voltar"
        >
          ←
        </button>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <AppName />
        </span>
        <span className="text-xs font-medium text-gray-400">{step}/4</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 max-w-sm mx-auto w-full">

        {/* Labels */}
        <p className="text-[11px] uppercase tracking-[0.5em] text-gray-400 mb-1">{meta.eyebrow}</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{meta.title}</h1>
        <p className="text-sm text-gray-500 mb-8">{meta.subtitle}</p>

        {/* Step 1: Name + Photo */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <button
              type="button"
              onClick={() => setShowAvatarSheet(true)}
              className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mx-auto hover:border-gray-400 transition"
              aria-label="Adicionar foto"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  <span className="text-[10px] font-medium">Foto</span>
                </div>
              )}
            </button>
            {avatarUrl && (
              <button
                type="button"
                className="text-xs text-gray-400 underline text-center -mt-4"
                onClick={() => setShowAvatarSheet(true)}
              >
                Alterar foto
              </button>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Nome completo *
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAdvance() && handleNext()}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>
        )}

        {/* Step 2: Phone */}
        {step === 2 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Telemóvel *
            </label>
            <PhoneInput
              international
              defaultCountry={country}
              country={country}
              onCountryChange={(c) => c && setCountry(c)}
              value={phone}
              onChange={(val) => setPhone(val ?? "")}
              className="phone-input-wrapper"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Seleciona o país e escreve o número - formata automaticamente.
            </p>
          </div>
        )}

        {/* Step 3: Home location */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            {/* Botão usar localização atual */}
            <button
              type="button"
              disabled={locating}
              onClick={async () => {
                if (!navigator.geolocation) { setLocError("O teu browser não suporta geolocalização."); return; }
                setLocating(true); setLocError("");
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setHomeLat(latitude); setHomeLng(longitude);
                    // Tentar geocodificação reversa via Mapbox
                    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
                    if (token) {
                      try {
                        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&language=pt&types=address,place,neighborhood&limit=1`);
                        const data = await res.json();
                        const label = data.features?.[0]?.place_name ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                        setHomeAddress(label);
                      } catch { setHomeAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`); }
                    } else {
                      setHomeAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    }
                    setLocating(false);
                  },
                  (err) => {
                    setLocating(false);
                    setLocError(err.code === err.PERMISSION_DENIED ? "Permissão de localização negada." : "Não foi possível obter a localização.");
                  },
                  { enableHighAccuracy: true, timeout: 8000 }
                );
              }}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:border-gray-900 hover:text-gray-900 transition disabled:opacity-50"
            >
              {locating ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
              )}
              {locating ? "A localizar…" : "Usar a minha localização atual"}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">ou escreve</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Zona / Morada</label>
              <LocationInput
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
                placeholder="Ex: Amadora, Quinta da Fonte"
                value={homeAddress}
                lat={homeLat}
                lng={homeLng}
                onLabelChange={(label) => { setHomeAddress(label); setHomeLat(undefined); setHomeLng(undefined); setLocError(""); }}
                onLocationSelect={(loc: LocationValue) => { setHomeAddress(loc.label); setHomeLat(loc.lat); setHomeLng(loc.lng); setLocError(""); }}
              />
            </div>

            {locError && <p className="text-xs text-red-500">{locError}</p>}
            {homeLat && homeLng && (
              <p className="text-[11px] text-green-600 font-medium">
                ✓ Localização confirmada - vamos usá-la para sugerir boleias perto de ti.
              </p>
            )}
            {homeAddress && !homeLat && (
              <p className="text-[11px] text-amber-600 font-medium">
                Seleciona uma sugestão da lista para confirmar a localização.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-500">{name.charAt(0).toUpperCase()}</div>
                }
              </div>
              <div>
                <p className="font-semibold text-gray-900">{name}</p>
                <p className="text-sm text-gray-500">{phone}</p>
                <p className="text-sm text-gray-500">{homeAddress}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-2">
              Podes alterar estes dados a qualquer momento no teu perfil.
            </p>

            {saveError && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
                {saveError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div
        className="px-6 pb-8 pt-4 max-w-sm mx-auto w-full"
      >
        <button
          type="button"
          disabled={!canAdvance() || saving}
          onClick={isLast ? handleFinish : handleNext}
          className="w-full h-14 rounded-full bg-gray-900 text-white font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900"
        >
          {saving ? "A guardar…" : isLast ? "Entrar na app →" : "Continuar →"}
        </button>
      </div>

      {/* Avatar sheet */}
      <Sheet open={showAvatarSheet} onClose={() => setShowAvatarSheet(false)} title="Foto de perfil">
        <ImageUpload
          onImageSelected={(url) => {
            setAvatarUrl(url);
            setShowAvatarSheet(false);
          }}
        />
      </Sheet>
    </div>
  );
}
