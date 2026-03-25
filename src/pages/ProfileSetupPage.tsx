import { useState } from "react";
import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import Sheet from "../components/ui/Sheet";
import ImageUpload from "../components/ui/ImageUpload";
import { LocationInput, type LocationValue } from "../components/ui/LocationInput";
import { reverseGeocode } from "../utils/googleMaps";

type Step = 1 | 2 | 3 | 4;

const STEP_CONFIG: Record<Step, { eyebrow: string; title: string; subtitle: string }> = {
  1: {
    eyebrow: "Identidade",
    title: "Como te chamamos?",
    subtitle: "O teu nome e foto aparecem nas boleias e no chat.",
  },
  2: {
    eyebrow: "Contacto",
    title: "O teu numero",
    subtitle: "Usado para confirmacoes e alertas de viagem.",
  },
  3: {
    eyebrow: "Localizacao",
    title: "Onde e a tua casa?",
    subtitle: "Usamos para te sugerir boleias perto de ti. Nao partilhamos a morada exacta com ninguem.",
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
      showError("Campo obrigatorio", "Indica o teu nome.");
      return;
    }
    if (step === 2 && !phone.trim()) {
      showError("Campo obrigatorio", "Indica o teu numero de telemovel.");
      return;
    }
    if (step === 3 && (homeLat == null || homeLng == null)) {
      showError("Localizacao necessaria", "Usa a localizacao atual ou seleciona uma morada da lista.");
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
    <div className="min-h-[100svh] bg-[#F9FAF5] flex flex-col font-manrope" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

      {/* Progress bar */}
      <div className="h-1 bg-[#e7e9e4]">
        <div
          className="h-1 bg-[#52B788] transition-all duration-300"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <button
          type="button"
          onClick={handleBack}
          className={
            step === 1
              ? "invisible"
              : "w-10 h-10 rounded-full border border-[#e7e9e4] flex items-center justify-center text-[#1B4332] hover:bg-[#f3f4ef] transition"
          }
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <span className="font-noto-serif italic font-bold text-[#1B4332] text-lg">HopOn</span>
        <span className="text-xs font-medium text-[#717973]">{step}/4</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 max-w-sm mx-auto w-full">

        {/* Labels */}
        <p className="text-[11px] uppercase tracking-[0.5em] text-[#717973] mb-1">{meta.eyebrow}</p>
        <h1 className="text-2xl font-bold text-[#1A1C19] mb-1 font-noto-serif italic">{meta.title}</h1>
        <p className="text-sm text-[#414844] mb-8">{meta.subtitle}</p>

        {/* Step 1: Name + Photo */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <button
              type="button"
              onClick={() => setShowAvatarSheet(true)}
              className="w-24 h-24 rounded-full bg-[#f3f4ef] border-2 border-dashed border-[#c1c8c2] flex items-center justify-center overflow-hidden mx-auto hover:border-[#52B788] transition"
              aria-label="Adicionar foto"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[#717973]">
                  <span className="material-symbols-outlined text-2xl">person</span>
                  <span className="text-[10px] font-medium">Foto</span>
                </div>
              )}
            </button>
            {avatarUrl && (
              <button
                type="button"
                className="text-xs text-[#717973] underline text-center -mt-4"
                onClick={() => setShowAvatarSheet(true)}
              >
                Alterar foto
              </button>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#414844] uppercase tracking-wide">
                Nome completo *
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: Joao Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAdvance() && handleNext()}
                className="w-full rounded-xl border border-[#e7e9e4] bg-[#f3f4ef] px-4 py-3 text-sm text-[#1A1C19] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 placeholder:text-[#717973]/50"
              />
            </div>
          </div>
        )}

        {/* Step 2: Phone */}
        {step === 2 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#414844] uppercase tracking-wide">
              Telemovel *
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
            <p className="text-[11px] text-[#717973] mt-1">
              Seleciona o pais e escreve o numero - formata automaticamente.
            </p>
          </div>
        )}

        {/* Step 3: Home location */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            {/* Botao usar localizacao atual */}
            <button
              type="button"
              disabled={locating}
              onClick={async () => {
                if (!navigator.geolocation) { setLocError("O teu browser nao suporta geolocalizacao."); return; }
                setLocating(true); setLocError("");
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setHomeLat(latitude); setHomeLng(longitude);
                    const label = await reverseGeocode(latitude, longitude);
                    setHomeAddress(label);
                    setLocating(false);
                  },
                  (err) => {
                    setLocating(false);
                    setLocError(
                      err.code === err.PERMISSION_DENIED
                        ? "Permissao negada pelo browser. Clica no cadeado na barra de enderecos para ativar, ou escreve a morada manualmente."
                        : "Nao foi possivel obter a localizacao (desktop sem GPS?). Escreve a morada no campo abaixo."
                    );
                  },
                  { enableHighAccuracy: true, timeout: 8000 }
                );
              }}
              className="w-full h-12 rounded-xl border-2 border-dashed border-[#c1c8c2] flex items-center justify-center gap-2 text-sm font-semibold text-[#414844] hover:border-[#52B788] hover:text-[#1B4332] transition disabled:opacity-50"
            >
              {locating ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /></svg>
              ) : (
                <span className="material-symbols-outlined text-lg">my_location</span>
              )}
              {locating ? "A localizar..." : "Usar a minha localizacao atual"}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-[#e7e9e4]" />
              <span className="text-xs text-[#717973]">ou escreve</span>
              <div className="flex-1 h-px bg-[#e7e9e4]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#414844] uppercase tracking-wide">Zona / Morada</label>
              <LocationInput
                className="w-full rounded-xl border border-[#e7e9e4] bg-[#f3f4ef] px-4 py-3 text-sm text-[#1A1C19] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 placeholder:text-[#717973]/50"
                placeholder="Ex: Amadora, Quinta da Fonte"
                value={homeAddress}
                lat={homeLat}
                lng={homeLng}
                onLabelChange={(label) => { setHomeAddress(label); setHomeLat(undefined); setHomeLng(undefined); setLocError(""); }}
                onLocationSelect={(loc: LocationValue) => { setHomeAddress(loc.label); setHomeLat(loc.lat); setHomeLng(loc.lng); setLocError(""); }}
              />
            </div>

            {locError && <p className="text-xs text-[#ba1a1a]">{locError}</p>}
            {homeLat && homeLng && (
              <p className="text-[11px] text-[#006c48] font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Localizacao confirmada - vamos usa-la para sugerir boleias perto de ti.
              </p>
            )}
            {homeAddress && !homeLat && (
              <p className="text-[11px] text-[#b06b00] font-medium">
                Seleciona uma sugestao da lista para confirmar a localizacao.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 bg-[#f3f4ef] rounded-2xl p-4 border border-[#e7e9e4]">
              <div className="w-14 h-14 rounded-full bg-[#D0E8DC] flex-shrink-0 overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[#1B4332]">{name.charAt(0).toUpperCase()}</div>
                }
              </div>
              <div>
                <p className="font-semibold text-[#1A1C19]">{name}</p>
                <p className="text-sm text-[#717973]">{phone}</p>
                <p className="text-sm text-[#717973]">{homeAddress}</p>
              </div>
            </div>

            <p className="text-xs text-[#717973] text-center mt-2">
              Podes alterar estes dados a qualquer momento no teu perfil.
            </p>

            {saveError && (
              <div className="rounded-2xl bg-[#ffdad6] border border-[#ba1a1a]/20 px-4 py-3 text-sm text-[#ba1a1a] text-center">
                {saveError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="px-6 pb-8 pt-4 max-w-sm mx-auto w-full">
        <button
          type="button"
          disabled={!canAdvance() || saving}
          onClick={isLast ? handleFinish : handleNext}
          className="w-full h-14 rounded-full bg-[#52B788] text-white font-bold text-sm shadow-lg shadow-[#52B788]/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#52B788] flex items-center justify-center gap-2"
        >
          {saving ? "A guardar..." : isLast ? "Entrar na app" : "Continuar"}
          {!saving && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
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
