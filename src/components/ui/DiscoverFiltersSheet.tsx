import type { DiscoverFilters } from "../../pages/types/discover";
import { useEffect, useId, useState } from "react";
import Sheet from "./Sheet";
import { Button } from "./Button";
import TimePicker from "./TimePicker";

type Props = {
  open: boolean;
  initial: DiscoverFilters;
  onClose: () => void;
  onApply: (next: DiscoverFilters) => void;
};

export default function DiscoverFiltersSheet({ open, initial, onClose, onApply }: Props) {
  const [f, setF] = useState<DiscoverFilters>(initial);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const uid = useId();

  useEffect(() => {
    if (open) { setF(initial); setShowAdvanced(false); }
  }, [open, initial]);

  function update<K extends keyof DiscoverFilters>(k: K, v: DiscoverFilters[K]) {
    setF(prev => ({ ...prev, [k]: v }));
  }

  function clearAll() {
    setF(prev => ({
      ...prev,
      q: "", origin: "", destination: "",
      deviationKm: 0, routeOverlapPct: 60,
      departFrom: "", departTo: "", toleranceMin: 5,
      minSeats: 1, baggage: "any", ac: false, vibe: "any", music: false,
      minRating: 4.0, punctuality: "any", frequent: false, verified: false,
      accessible: false, backSeatsFree: false, maxPrice: undefined, sort: "recommended",
    }));
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajustes"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={clearAll}>Limpar</Button>
          <Button variant="outline" className="flex-1" onClick={() => onApply(f)}>
            Ver resultados
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        {/* === CORE (sempre visível) ===================================== */}
        {/* Pesquisa */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-q`}>Pesquisar</label>
          <input
            id={`${uid}-q`}
            className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20 placeholder:text-gray-400"
            placeholder="Ex.: ULisboa, Estoril, 08:00"
            title="Pesquisar por local, campus, curso ou hora"
            value={f.q}
            onChange={e => update("q", e.target.value)}
          />
        </div>

        {/* Janela horária */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <TimePicker
              label="Partida de"
              value={f.departFrom || "08:00"}
              onChange={(v) => update("departFrom", v)}
            />
          </div>
          <div>
            <TimePicker
              label="Até"
              value={f.departTo || "20:00"}
              onChange={(v) => update("departTo", v)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-tol`}>Tolerância (± min)</label>
            <input
              id={`${uid}-tol`} 
              className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20" 
              type="number" min={0} max={20} title="Minutos de tolerância"
              value={f.toleranceMin} onChange={e => update("toleranceMin", Number(e.target.value))}
            />
          </div>
        </div>

        {/* Lugares mínimos */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-seats`}>Lugares mínimos</label>
            <input
              id={`${uid}-seats`} 
              className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20" 
              type="number" min={1} max={4}
              title="Número mínimo de lugares"
              value={f.minSeats} onChange={e => update("minSeats", Number(e.target.value))}
            />
          </div>

          {/* Ordenação */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-sort`}>Ordenar por</label>
            <select
              id={`${uid}-sort`} 
              className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20" 
              title="Ordenação"
              value={f.sort} onChange={e => update("sort", e.target.value as DiscoverFilters["sort"])}
            >
              <option value="recommended">Recomendado</option>
              <option value="nearby">Mais perto</option>
              <option value="earliest">Partida mais cedo</option>
              <option value="shortest">Menor duração</option>
              <option value="rating">Melhor avaliação</option>
            </select>
          </div>
        </div>

        {/* Verificados */}
        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
              <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-gray-300 bg-gray-50" 
              checked={f.verified} 
              onChange={e => update("verified", e.target.checked)} 
            />
            <span className="text-sm text-gray-900">Apenas perfis verificados</span>
          </label>
        </div>

        {/* Botão de avançados */}
        <div className="text-center pt-2">
          <button
            type="button"
            className="text-sm text-gray-900 font-medium hover:underline"
            aria-expanded={showAdvanced}
            aria-controls={`${uid}-advanced`}
            onClick={() => setShowAdvanced(s => !s)}
          >
            {showAdvanced ? "Esconder filtros avançados" : "Filtros avançados"}
          </button>
        </div>

        {/* === ADVANCED (escondido por defeito) ========================== */}
        {showAdvanced && (
          <div id={`${uid}-advanced`} className="grid gap-4 pt-4 border-t border-gray-200">
            {/* Origem/destino */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-origin`}>Origem</label>
                <input
                  id={`${uid}-origin`} 
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20 placeholder:text-gray-400"
                  placeholder="Campus / Local" title="Local de partida"
                  value={f.origin || ""} onChange={e => update("origin", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-destination`}>Destino</label>
                <input
                  id={`${uid}-destination`} 
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20 placeholder:text-gray-400"
                  placeholder="Campus / Local" title="Local de chegada"
                  value={f.destination || ""} onChange={e => update("destination", e.target.value)}
                />
              </div>
            </div>

            {/* Desvio/overlap */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-dev`}>Raio de desvio (km)</label>
                <input
                  id={`${uid}-dev`} type="range" min={0} max={10}
                  className="w-full accent-gradient-end"
                  value={f.deviationKm} onChange={e => update("deviationKm", Number(e.target.value))}
                />
                <div className="text-xs text-gray-900/60 mt-1">{f.deviationKm} km</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-overlap`}>Sobreposição de rota (%)</label>
                <input
                  id={`${uid}-overlap`} type="range" min={0} max={100}
                  className="w-full accent-gradient-end"
                  value={f.routeOverlapPct} onChange={e => update("routeOverlapPct", Number(e.target.value))}
                />
                <div className="text-xs text-gray-900/60 mt-1">{f.routeOverlapPct}%</div>
              </div>
            </div>

            {/* Conforto */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-bag`}>Bagagem</label>
                <select
                  id={`${uid}-bag`} 
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20" 
                  title="Tipo de bagagem"
                  value={f.baggage} onChange={e => update("baggage", e.target.value as DiscoverFilters["baggage"])}
                >
                  <option value="any">Qualquer</option>
                  <option value="backpack">Mochila</option>
                  <option value="carry_on">Mala cabine</option>
                  <option value="large">Mala grande</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-vibe`}>Vibe</label>
                <select
                  id={`${uid}-vibe`} 
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20" 
                  title="Ambiente preferido"
                  value={f.vibe} onChange={e => update("vibe", e.target.value as DiscoverFilters["vibe"])}
                >
                  <option value="any">Qualquer</option>
                  <option value="quiet">Silencioso</option>
                  <option value="chatty">Conversa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-price`}>Contribuição máx. (€)</label>
                <input
                  id={`${uid}-price`} 
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20 placeholder:text-gray-400" 
                  type="number" min={0} step={0.5}
                  title="Valor máximo por viagem"
                  value={f.maxPrice ?? ""} placeholder="Sem limite"
                  onChange={e => update("maxPrice", e.target.value === "" ? undefined : Number(e.target.value))}
                />
              </div>
            </div>

            {/* Preferências extra */}
            <div className="grid grid-cols-3 gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 bg-gray-50" checked={f.ac} onChange={e => update("ac", e.target.checked)} />
                <span className="text-sm text-gray-900">Ar condicionado</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 bg-gray-50" checked={f.music} onChange={e => update("music", e.target.checked)} />
                <span className="text-sm text-gray-900">Música</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 bg-gray-50" checked={f.backSeatsFree} onChange={e => update("backSeatsFree", e.target.checked)} />
                <span className="text-sm text-gray-900">Bancos traseiros livres</span>
              </label>
            </div>

            {/* Reputação extra */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-rating`}>Avaliação mínima</label>
                <input
                  id={`${uid}-rating`} type="range" min={3.5} max={5} step={0.1}
                  className="w-full accent-gradient-end"
                  value={f.minRating} onChange={e => update("minRating", Number(e.target.value))}
                />
                <div className="text-xs text-gray-900/60 mt-1">{f.minRating.toFixed(1)} ★</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={`${uid}-punct`}>Pontualidade</label>
                <select
                  id={`${uid}-punct`} 
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gradient-end focus:ring-2 focus:ring-gradient-end/20" 
                  title="Nível de pontualidade"
                  value={f.punctuality} onChange={e => update("punctuality", e.target.value as DiscoverFilters["punctuality"])}
                >
                  <option value="any">Qualquer</option>
                  <option value="med">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Preferências</label>
                <label className="inline-flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 bg-gray-50" checked={f.frequent} onChange={e => update("frequent", e.target.checked)} />
                  <span className="text-sm text-gray-900">Condutor frequente</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 bg-gray-50" checked={f.accessible} onChange={e => update("accessible", e.target.checked)} />
                  <span className="text-sm text-gray-900">Acessível</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}