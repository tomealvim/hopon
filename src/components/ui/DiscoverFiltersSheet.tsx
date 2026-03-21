import type { DiscoverFilters } from "../../pages/types/discover";
import { useEffect, useId, useState } from "react";
import Sheet from "./Sheet";
import { Button } from "./Button";
import LocationAutocomplete from "./LocationAutocomplete";

type Props = {
  open: boolean;
  initial: DiscoverFilters;
  onClose: () => void;
  onApply: (next: DiscoverFilters) => void;
  mapboxToken: string;
};

export default function DiscoverFiltersSheet({ open, initial, onClose, onApply, mapboxToken }: Props) {
  const [f, setF] = useState<DiscoverFilters>(initial);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const uid = useId();

  useEffect(() => {
    if (open) { setF(initial); setShowAdvanced(false); }
  }, [open, initial]);

  function update<K extends keyof DiscoverFilters>(k: K, v: DiscoverFilters[K]) {
    setF(prev => {
      const next = { ...prev, [k]: v };
      // Se o utilizador define uma hora sem data, auto-definir hoje
      if ((k === "departFrom" || k === "departTo") && v && !next.date) {
        next.date = new Date().toISOString().slice(0, 10);
      }
      return next;
    });
  }

  function clearAll() {
    setF(prev => ({
      ...prev,
      q: "", origin: "", destination: "",
      originLat: undefined, originLng: undefined, destinationLat: undefined, destinationLng: undefined, radiusKm: 10,
      date: "",
      deviationKm: 0, routeOverlapPct: 60,
      departFrom: "", departTo: "", toleranceMin: 5,
      minSeats: 1, baggage: "any", ac: false, vibe: "any", music: false,
      minRating: 4.0, punctuality: "any", frequent: false, verified: false,
      accessible: false, backSeatsFree: false, maxPrice: undefined, sort: "recommended",
    }));
  }

  // Data mínima = hoje
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtros"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={clearAll}>Limpar tudo</Button>
          <Button variant="outline" className="flex-1" onClick={() => onApply(f)}>
            Ver resultados
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">

        {/* Origem / Destino */}
        <div className="grid grid-cols-1 gap-3">
          <LocationAutocomplete
            id={`${uid}-origin`}
            label="Origem"
            placeholder="Ex.: Lisboa"
            value={f.origin || ""}
            mapboxToken={mapboxToken}
            onSelect={(s) => {
              if (s) {
                setF(prev => ({ ...prev, origin: s.label, originLat: s.lat, originLng: s.lng }));
              } else {
                setF(prev => ({ ...prev, origin: "", originLat: undefined, originLng: undefined }));
              }
            }}
          />
          <LocationAutocomplete
            id={`${uid}-destination`}
            label="Destino"
            placeholder="Ex.: Porto"
            value={f.destination || ""}
            mapboxToken={mapboxToken}
            onSelect={(s) => {
              if (s) {
                setF(prev => ({ ...prev, destination: s.label, destinationLat: s.lat, destinationLng: s.lng }));
              } else {
                setF(prev => ({ ...prev, destination: "", destinationLat: undefined, destinationLng: undefined }));
              }
            }}
          />
          {f.originLat && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Raio de pesquisa: {f.radiusKm} km</label>
              <input
                type="range" min={2} max={50} step={1}
                value={f.radiusKm}
                onChange={e => setF(prev => ({ ...prev, radiusKm: Number(e.target.value) }))}
                className="w-full accent-gray-900"
              />
            </div>
          )}
        </div>

        {/* Data */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-date`}>Data</label>
          <input
            id={`${uid}-date`}
            type="date"
            min={today}
            className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            value={f.date || ""}
            onChange={e => update("date", e.target.value)}
          />
        </div>

        {/* Janela horária (só útil quando data está definida) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-from`}>Hora de</label>
            <input
              id={`${uid}-from`}
              type="time"
              className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              value={f.departFrom || ""}
              onChange={e => update("departFrom", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-to`}>Hora até</label>
            <input
              id={`${uid}-to`}
              type="time"
              className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              value={f.departTo || ""}
              onChange={e => update("departTo", e.target.value)}
            />
          </div>
        </div>

        {/* Lugares mínimos + Preço máximo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-seats`}>Lugares mínimos</label>
            <input
              id={`${uid}-seats`}
              className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              type="number" min={1} max={8}
              value={f.minSeats}
              onChange={e => update("minSeats", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-price`}>Preço máx. (€/lugar)</label>
            <input
              id={`${uid}-price`}
              className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 placeholder:text-gray-400"
              type="number" min={0} step={0.5}
              value={f.maxPrice ?? ""}
              placeholder="Sem limite"
              onChange={e => update("maxPrice", e.target.value === "" ? undefined : Number(e.target.value))}
            />
          </div>
        </div>

        {/* Verificados */}
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 bg-gray-50"
            checked={f.verified}
            onChange={e => update("verified", e.target.checked)}
          />
          <span className="text-sm text-gray-900">Apenas condutores verificados</span>
        </label>

        {/* Botão de avançados */}
        <div className="text-center pt-2">
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-900 font-medium hover:underline"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced(s => !s)}
          >
            {showAdvanced ? "Esconder filtros avançados" : "Mais filtros"}
          </button>
        </div>

        {/* Avançados */}
        {showAdvanced && (
          <div className="grid gap-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-sort`}>Ordenar por</label>
                <select
                  id={`${uid}-sort`}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  value={f.sort}
                  onChange={e => update("sort", e.target.value as DiscoverFilters["sort"])}
                >
                  <option value="recommended">Recomendado</option>
                  <option value="earliest">Partida mais cedo</option>
                  <option value="rating">Melhor avaliação</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-vibe`}>Ambiente</label>
                <select
                  id={`${uid}-vibe`}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  value={f.vibe}
                  onChange={e => update("vibe", e.target.value as DiscoverFilters["vibe"])}
                >
                  <option value="any">Qualquer</option>
                  <option value="quiet">Silencioso</option>
                  <option value="chatty">Conversa</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
