import { useState } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { LocationInput, type LocationValue } from "../ui/LocationInput";
import { cn } from "../../utils/cn";
import { apiRequest } from "../../services/api";
import { reverseGeocode } from "../../utils/googleMaps";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onSkip?: () => void;
  isOnboarding?: boolean;
};

const ALL_DAYS = [
  { key: "segunda", label: "Seg" },
  { key: "terca",   label: "Ter" },
  { key: "quarta",  label: "Qua" },
  { key: "quinta",  label: "Qui" },
  { key: "sexta",   label: "Sex" },
  { key: "sabado",  label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

export default function SaveRouteSheet({ open, onClose, onSaved, onSkip, isOnboarding }: Props) {
  const [originLabel,   setOriginLabel]   = useState("");
  const [originLat,     setOriginLat]     = useState<number | undefined>();
  const [originLng,     setOriginLng]     = useState<number | undefined>();
  const [destLabel,     setDestLabel]     = useState("");
  const [destLat,       setDestLat]       = useState<number | undefined>();
  const [destLng,       setDestLng]       = useState<number | undefined>();
  const [departTime,    setDepartTime]    = useState("");
  const [days,          setDays]          = useState<string[]>(["segunda","terca","quarta","quinta","sexta"]);
  const [loading,       setLoading]       = useState(false);
  const [locating,      setLocating]      = useState(false);
  const [locError,      setLocError]      = useState("");
  const [error,         setError]         = useState("");
  const [done,          setDone]          = useState(false);

  const canSubmit = originLabel.trim() && destLabel.trim() && departTime && days.length > 0 && !loading;

  function handleOriginSelect(loc: LocationValue) {
    setOriginLabel(loc.label);
    setOriginLat(loc.lat);
    setOriginLng(loc.lng);
    setLocError("");
  }

  function handleOriginLabelChange(label: string) {
    setOriginLabel(label);
    setOriginLat(undefined);
    setOriginLng(undefined);
    setLocError("");
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocError("O teu browser não suporta geolocalização.");
      return;
    }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = await reverseGeocode(latitude, longitude);
        setOriginLabel(label);
        setOriginLat(latitude);
        setOriginLng(longitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError("Permissão de localização negada. Ativa nas definições do browser.");
        } else {
          setLocError("Não foi possível obter a localização.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function toggleDay(key: string) {
    setDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  }

  function handleDestSelect(loc: LocationValue) {
    setDestLabel(loc.label);
    setDestLat(loc.lat);
    setDestLng(loc.lng);
  }

  function handleDestLabelChange(label: string) {
    setDestLabel(label);
    setDestLat(undefined);
    setDestLng(undefined);
  }

  function reset() {
    setOriginLabel("");
    setOriginLat(undefined);
    setOriginLng(undefined);
    setDestLabel("");
    setDestLat(undefined);
    setDestLng(undefined);
    setDepartTime("");
    setDays(["segunda","terca","quarta","quinta","sexta"]);
    setError("");
    setLocError("");
    setDone(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await apiRequest("/user-routes", {
        method: "POST",
        body: JSON.stringify({
          origin: originLabel.trim(),
          originLat,
          originLng,
          destination: destLabel.trim(),
          destinationLat: destLat,
          destinationLng: destLng,
          departTime,
          daysOfWeek: days,
        }),
      });
      setDone(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao guardar rota.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={handleClose} title={isOnboarding ? "A tua rota habitual" : "Guardar rota habitual"}>
      {done ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="text-5xl">✅</div>
          <p className="text-lg font-bold text-[#1A1C19]">Rota guardada!</p>
          <p className="text-sm text-[#414844] text-center max-w-[280px]">
            Agora vais ver boleias que batem com este percurso na aba <strong>Para Ti</strong>.
          </p>
          <Button className="mt-4 w-full" onClick={handleClose}>Fechar</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-6">
          {isOnboarding ? (
            <div className="bg-[#f3f4ef] border border-[#e7e9e4] rounded-xl p-4">
              <p className="text-sm font-semibold text-[#1A1C19] mb-1">Bem-vindo ao HopOn!</p>
              <p className="text-xs text-[#414844]">
                Diz-nos o teu trajeto diário e vamos encontrar boleias que batem certo - sem teres de pesquisar.
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#414844]">
              Define a tua rota habitual e vemos boleias disponíveis que batem certo.
            </p>
          )}

          {/* Origem */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#414844] uppercase tracking-wide">
                Origem
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="flex items-center gap-1 text-xs font-semibold text-[#1A1C19] disabled:opacity-50"
              >
                {locating ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                )}
                {locating ? "A localizar…" : "Usar localização atual"}
              </button>
            </div>
            <LocationInput
              className="w-full border border-[#e7e9e4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/20"
              placeholder="Ex: Lisboa, Marquês de Pombal"
              value={originLabel}
              lat={originLat}
              lng={originLng}
              onLabelChange={handleOriginLabelChange}
              onLocationSelect={handleOriginSelect}
            />
            {locError && <p className="text-xs text-red-500">{locError}</p>}
          </div>

          {/* Destino */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#414844] uppercase tracking-wide">Destino</label>
            <LocationInput
              className="w-full border border-[#e7e9e4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/20"
              placeholder="Ex: Porto, Estação de Campanhã"
              value={destLabel}
              lat={destLat}
              lng={destLng}
              onLabelChange={handleDestLabelChange}
              onLocationSelect={handleDestSelect}
            />
          </div>

          {/* Hora habitual */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#414844] uppercase tracking-wide">Hora habitual</label>
            <input
              type="time"
              className="w-full border border-[#e7e9e4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B788]/20"
              value={departTime}
              onChange={(e) => setDepartTime(e.target.value)}
            />
          </div>

          {/* Dias da semana */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#414844] uppercase tracking-wide">Dias habituais</label>
            <div className="flex gap-2 flex-wrap">
              {ALL_DAYS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                    days.includes(key)
                      ? "bg-[#1B4332] text-white border-[#1B4332]"
                      : "bg-white text-[#414844] border-[#e7e9e4] hover:border-[#c1c8c2]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            className="w-full mt-2"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {loading ? "A guardar…" : "Guardar rota"}
          </Button>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full text-center text-xs text-[#717973] hover:text-[#414844] py-1 transition"
            >
              Saltar por agora
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
