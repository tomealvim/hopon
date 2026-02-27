import { useEffect, useId, useMemo, useState } from "react";
import TimePicker from "./TimePicker";
import { Button } from "./Button";
import { cn } from "../../utils/cn";
import { useAuth } from "../../contexts/AuthContext";
import { LocationInput } from "./LocationInput";
import type { Vehicle } from "../../pages/types/user";

export type OfferRideFormValues = {
  vehicleId: string;
  origem: string;
  origemLat?: number;
  origemLng?: number;
  destino: string;
  destinoLat?: number;
  destinoLng?: number;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  lugares: number;
  aceitaDesvios: boolean;
  desvioMaxMin: number; // minutos
  pontoEncontro?: string;
  recorrente: boolean;
  diasSemana: Array<"seg"|"ter"|"qua"|"qui"|"sex">;
  observacoes?: string;
  preferencias: {
    musica: boolean;
    falar: boolean;
    bagagem: boolean;
    animais: boolean;
  };
};

export type OfferRideFormProps = {
  initial?: Partial<OfferRideFormValues>;
  onCancel: () => void;
  onSubmit: (values: OfferRideFormValues) => void;
  onRequireVehicleSetup?: () => void;
};

export default function OfferRideForm({ initial, onCancel, onSubmit, onRequireVehicleSetup }: OfferRideFormProps) {
  const { user, setActiveVehicle } = useAuth();
  const vehicles: Vehicle[] = useMemo(() => user?.vehicles ?? [], [user?.vehicles]);
  const hasVehicles = vehicles.length > 0;
  const activeVehicleId = user?.activeVehicleId;
  const today = useMemo(() => new Date().toISOString().slice(0,10), []);
  const defaultValues: OfferRideFormValues = {
    vehicleId: initial?.vehicleId ?? activeVehicleId ?? vehicles[0]?.id ?? "",
    origem: initial?.origem ?? "",
    destino: initial?.destino ?? "",
    data: initial?.data ?? today,
    hora: initial?.hora ?? "08:00",
    lugares: initial?.lugares ?? 3,
    aceitaDesvios: initial?.aceitaDesvios ?? true,
    desvioMaxMin: initial?.desvioMaxMin ?? 10,
    pontoEncontro: initial?.pontoEncontro ?? "",
    recorrente: initial?.recorrente ?? false,
    diasSemana: initial?.diasSemana ?? ["seg","ter","qua","qui","sex"],
    observacoes: initial?.observacoes ?? "",
    preferencias: initial?.preferencias ?? {
      musica: true,
      falar: true,
      bagagem: false,
      animais: false,
    },
  };

  const [values, setValues] = useState<OfferRideFormValues>(defaultValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hasVehicles) return;
    if (!values.vehicleId || !vehicles.some(vehicle => vehicle.id === values.vehicleId)) {
      const fallbackVehicleId = activeVehicleId ?? vehicles[0]?.id ?? "";
      if (fallbackVehicleId && fallbackVehicleId !== values.vehicleId) {
        setValues(prev => ({ ...prev, vehicleId: fallbackVehicleId }));
      }
    }
  }, [hasVehicles, vehicles, activeVehicleId, values.vehicleId]);

  const set = <K extends keyof OfferRideFormValues>(key: K, val: OfferRideFormValues[K]) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const setPref = (key: keyof OfferRideFormValues["preferencias"], val: boolean) => {
    setValues(prev => ({ ...prev, preferencias: { ...prev.preferencias, [key]: val } }));
  };

  const setTouchedField = (name: string) => setTouched(prev => ({ ...prev, [name]: true }));

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!values.vehicleId) e.vehicleId = "Seleciona um carro";
    if (!values.origem.trim()) e.origem = "Obrigatório";
    if (!values.destino.trim()) e.destino = "Obrigatório";
    if (!values.data) e.data = "Obrigatório";
    if (!values.hora) e.hora = "Obrigatório";
    if (values.lugares < 1) e.lugares = "Mínimo 1";
    if (values.aceitaDesvios && (values.desvioMaxMin < 0 || values.desvioMaxMin > 60)) e.desvioMaxMin = "0–60 min";
    return e;
  }, [values]);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (Object.keys(errors).length > 0) {
      setTouched({
        vehicleId: true,
        origem: true,
        destino: true,
        data: true,
        hora: true,
        lugares: true,
        desvioMaxMin: true,
      });
      return;
    }
    onSubmit(values);
  };

  const id = useId();

  if (!hasVehicles) {
    return (
      <div className="grid gap-4 p-4 text-center">
        <p className="text-base font-semibold text-gray-900">Precisas de um veículo associado</p>
        <p className="text-sm text-gray-600">
          Adiciona um carro em Perfil &gt; Veículos para poderes publicar boleias e calcular custos.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            onCancel();
            onRequireVehicleSetup?.();
          }}
        >
          Ir para Perfil
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-1">
      {/* Veículo: só mostrar seletor quando há mais de 1 carro; com 1 carro usa-se automaticamente */}
      {vehicles.length > 1 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Selecionar veículo</p>
          <div className="grid gap-2">
            {vehicles.map(vehicle => {
              const isSelected = vehicle.id === values.vehicleId;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-2 text-left transition",
                    isSelected
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-50"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  )}
                  aria-pressed={isSelected}
                  onClick={() => {
                    set("vehicleId", vehicle.id);
                    setTouchedField("vehicleId");
                    setActiveVehicle(vehicle.id);
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold">{vehicle.brand}</p>
                    <p className="text-xs text-gray-600">{vehicle.model}</p>
                  </div>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                      isSelected ? "border-emerald-300 bg-emerald-400 text-emerald-900" : "border-gray-300 text-gray-500"
                    )}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {touched.vehicleId && errors.vehicleId && (
            <div className="mt-2 text-xs text-red-300">{errors.vehicleId}</div>
          )}
        </div>
      )}
      <div className="">
        <label htmlFor={`${id}-origem`} className="block text-xs font-semibold text-gray-600 mb-1">De onde?</label>
        <LocationInput
          id={`${id}-origem`}
          className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 placeholder:text-gray-900/40"
          placeholder="Ex.: Estoril, estação, rua…"
          value={values.origem}
          lat={values.origemLat}
          lng={values.origemLng}
          onLabelChange={(label) => setValues(prev => ({ ...prev, origem: label, origemLat: undefined, origemLng: undefined }))}
          onLocationSelect={(loc) => setValues(prev => ({ ...prev, origem: loc.label, origemLat: loc.lat, origemLng: loc.lng }))}
          onBlur={() => setTouchedField("origem")}
          aria-invalid={!!errors.origem}
        />
        {touched.origem && errors.origem && <div className="text-xs text-red-300 mt-1">{errors.origem}</div>}
      </div>

      <div className="">
        <label htmlFor={`${id}-destino`} className="block text-xs font-semibold text-gray-600 mb-1">Para onde?</label>
        <LocationInput
          id={`${id}-destino`}
          className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 placeholder:text-gray-900/40"
          placeholder="Ex.: ULisboa Ciências, campus, morada…"
          value={values.destino}
          lat={values.destinoLat}
          lng={values.destinoLng}
          onLabelChange={(label) => setValues(prev => ({ ...prev, destino: label, destinoLat: undefined, destinoLng: undefined }))}
          onLocationSelect={(loc) => setValues(prev => ({ ...prev, destino: loc.label, destinoLat: loc.lat, destinoLng: loc.lng }))}
          onBlur={() => setTouchedField("destino")}
          aria-invalid={!!errors.destino}
        />
        {touched.destino && errors.destino && <div className="text-xs text-red-600 mt-1">{errors.destino}</div>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="">
          <label htmlFor={`${id}-data`} className="block text-xs font-semibold text-gray-600 mb-1">Dia</label>
          <input
            id={`${id}-data`}
            className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20"
            type="date"
            value={values.data}
            onChange={e=>set("data", e.target.value)}
            onBlur={()=>setTouchedField("data")}
            aria-invalid={!!errors.data}
          />
          {touched.data && errors.data && <div className="text-xs text-red-600 mt-1">{errors.data}</div>}
        </div>

        <div className="">
          <TimePicker
            label="Hora de partida"
            value={values.hora}
            onChange={(v) => {
              set("hora", v);
              setTouchedField("hora");
            }}
          />
          {touched.hora && errors.hora && <div className="text-xs text-red-600 mt-1">{errors.hora}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="">
          <label htmlFor={`${id}-lugares`} className="block text-xs font-semibold text-gray-600 mb-1">Lugares</label>
          <input
            id={`${id}-lugares`}
            className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20"
            type="number"
            min={1}
            max={6}
            value={values.lugares}
            onChange={e=>set("lugares", Number(e.target.value))}
            onBlur={()=>setTouchedField("lugares")}
            aria-invalid={!!errors.lugares}
          />
          {touched.lugares && errors.lugares && <div className="text-xs text-red-600 mt-1">{errors.lugares}</div>}
        </div>

        <div className="">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Aceita desvios?</label>
          <div className="flex items-center gap-2 mb-2">
            <input
              id={`${id}-aceita`}
              type="checkbox"
              className="w-4 h-4 rounded border-white/30 bg-white/5"
              checked={values.aceitaDesvios}
              onChange={e=>set("aceitaDesvios", e.target.checked)}
            />
            <label htmlFor={`${id}-aceita`} className="text-sm font-medium text-gray-900" aria-live="polite">
              {values.aceitaDesvios ? "Sim" : "Não"}
            </label>
          </div>
        </div>
      </div>

      {values.aceitaDesvios && (
        <div className="">
          <label htmlFor={`${id}-desvio`} className="block text-xs font-semibold text-gray-600 mb-1">Desvio máx. (min)</label>
          <input
            id={`${id}-desvio`}
            className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20"
            type="range"
            min={0}
            max={60}
            step={5}
            value={values.desvioMaxMin}
            onChange={e=>set("desvioMaxMin", Number(e.target.value))}
            onBlur={()=>setTouchedField("desvioMaxMin")}
            aria-valuemin={0}
            aria-valuemax={60}
            aria-valuenow={values.desvioMaxMin}
          />
          <div className="text-xs text-gray-500 mt-1">{values.desvioMaxMin} min</div>
          {touched.desvioMaxMin && errors.desvioMaxMin && <div className="text-xs text-red-600 mt-1">{errors.desvioMaxMin}</div>}
        </div>
      )}

      <div className="">
        <label htmlFor={`${id}-ponto`} className="block text-xs font-semibold text-gray-600 mb-1">Ponto de encontro</label>
        <input
          id={`${id}-ponto`}
          className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 placeholder:text-gray-900/40"
          placeholder="Ex.: estação de Cascais, portaria, etc."
          value={values.pontoEncontro}
          onChange={e=>set("pontoEncontro", e.target.value)}
        />
      </div>

      <div className="">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Recorrente</label>
        <div className="flex items-center gap-2 mb-2">
          <input
            id={`${id}-recorrente`}
            type="checkbox"
            className="w-4 h-4 rounded border-white/30 bg-white/5"
            checked={values.recorrente}
            onChange={e=>set("recorrente", e.target.checked)}
          />
          <label htmlFor={`${id}-recorrente`} className="text-sm font-medium text-gray-900" aria-live="polite">
            {values.recorrente ? "Sim" : "Não"}
          </label>
        </div>
        {values.recorrente && (
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Dias da semana">
            {(["seg","ter","qua","qui","sex"] as const).map(d => {
              const checked = values.diasSemana.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    checked
                      ? "bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end text-gray-900 border-transparent"
                      : "bg-white/5 text-gray-900 border-gray-200 hover:bg-white/10"
                  )}
                  aria-pressed={checked}
                  onClick={() => {
                    setValues(prev => {
                      const has = prev.diasSemana.includes(d);
                      const dias = has ? prev.diasSemana.filter(x=>x!==d) : [...prev.diasSemana, d];
                      return { ...prev, diasSemana: dias };
                    });
                  }}
                >
                  {d.toUpperCase()}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="">
        <label htmlFor={`${id}-obs`} className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
        <textarea
          id={`${id}-obs`}
          className="w-full px-3 py-2.5 border border-gray-200 bg-white/5 text-gray-900 rounded-xl outline-none focus:border-[#FF719A] focus:ring-2 focus:ring-[#FF719A]/20 resize-none placeholder:text-gray-900/40"
          rows={3}
          placeholder="Ex.: trago mochila grande, prefiro silêncio, etc."
          value={values.observacoes}
          onChange={e=>set("observacoes", e.target.value)}
        />
      </div>

      <fieldset className="" aria-label="Preferências">
        <legend className="block text-xs font-semibold text-gray-600 mb-1">Preferências</legend>
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-white/5" checked={values.preferencias.musica} onChange={e=>setPref("musica", e.target.checked)} />
          Música
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-white/5" checked={values.preferencias.falar} onChange={e=>setPref("falar", e.target.checked)} />
          Conversa
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-white/5" checked={values.preferencias.bagagem} onChange={e=>setPref("bagagem", e.target.checked)} />
          Espaço para bagagem
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-900">
          <input type="checkbox" className="w-4 h-4 rounded border-white/30 bg-white/5" checked={values.preferencias.animais} onChange={e=>setPref("animais", e.target.checked)} />
          Aceita animais
        </label>
      </fieldset>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" type="button" onClick={onCancel}>Cancelar</Button>
        <Button variant="outline" className="flex-1" type="submit">Publicar</Button>
      </div>
    </form>
  );
}