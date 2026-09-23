import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import TimePicker from "./TimePicker";
import { Button } from "./Button";
import { cn } from "../../utils/cn";
import { useAuth } from "../../contexts/AuthContext";
import { LocationInput } from "./LocationInput";
import type { Vehicle } from "../../pages/types/user";
import { apiRequest } from "../../services/api";
import { centsToEuros, centsToFixed, eurosToCents } from "../../utils/money";

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
  price?: number; // preço por lugar em € (só na UI; a API fala em cêntimos)
  routeDistanceKm?: number;
  routeDurationMin?: number;
  routeTollCostCents?: number;
  platformFeeCents?: number;
  instantBooking: boolean;
  aceitaDesvios: boolean;
  desvioMaxMin: number; // minutos
  pontoEncontro?: string;
  communityId?: string;
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

// Valores monetários da API de pricing em cêntimos
interface PriceBreakdown {
  distanceKm: number;
  durationMin: number;
  fuelCostCents: number;
  tollCostCents: number;
  pricePerSeatCents: number;
  platformFeeCents: number;
  passengerPaysCents: number;
  driverReceivesCents: number;
  suggestedMaxPriceCents: number;
}

interface RouteOption {
  routeId: string;
  label: string;
  distanceKm: number;
  durationMin: number;
  tollCostCents: number;
  breakdown: PriceBreakdown;
  polyline: string;
}

export default function OfferRideForm({ initial, onCancel, onSubmit, onRequireVehicleSetup }: OfferRideFormProps) {
  const { user, setActiveVehicle } = useAuth();
  const vehicles: Vehicle[] = useMemo(() => user?.vehicles ?? [], [user?.vehicles]);
  const hasVehicles = vehicles.length > 0;
  const activeVehicleId = user?.activeVehicleId;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const defaultValues: OfferRideFormValues = {
    vehicleId: initial?.vehicleId ?? activeVehicleId ?? vehicles[0]?.id ?? "",
    origem: initial?.origem ?? "",
    destino: initial?.destino ?? "",
    data: initial?.data ?? today,
    hora: initial?.hora ?? "08:00",
    lugares: initial?.lugares ?? 3,
    price: initial?.price ?? undefined,
    instantBooking: initial?.instantBooking ?? true,
    aceitaDesvios: initial?.aceitaDesvios ?? true,
    desvioMaxMin: initial?.desvioMaxMin ?? 10,
    pontoEncontro: initial?.pontoEncontro ?? "",
    communityId: initial?.communityId ?? undefined,
    recorrente: initial?.recorrente ?? false,
    diasSemana: initial?.diasSemana ?? ["seg", "ter", "qua", "qui", "sex"],
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

  // Pricing state
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const pricingDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Comunidades do utilizador (para boleia privada)
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    apiRequest<{ id: string; name: string }[]>("/communities/mine")
      .then((data) => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => setCommunities([]));
  }, []);

  useEffect(() => {
    if (!hasVehicles) return;
    if (!values.vehicleId || !vehicles.some((v) => v.id === values.vehicleId)) {
      const fallback = activeVehicleId ?? vehicles[0]?.id ?? "";
      if (fallback && fallback !== values.vehicleId) {
        setValues((prev) => ({ ...prev, vehicleId: fallback }));
      }
    }
  }, [hasVehicles, vehicles, activeVehicleId, values.vehicleId]);

  // Calcular rotas quando os campos necessários estão preenchidos
  const canCalculate =
    values.origemLat != null &&
    values.origemLng != null &&
    values.destinoLat != null &&
    values.destinoLng != null &&
    values.vehicleId &&
    values.data &&
    values.hora &&
    values.lugares >= 1;

  const fetchRoutes = useCallback(async () => {
    if (!canCalculate) return;
    setPricingLoading(true);
    setPricingError(null);
    try {
      const departureTime = new Date(`${values.data}T${values.hora}:00`).toISOString();
      const routes = await apiRequest<RouteOption[]>("/pricing/calculate", {
        method: "POST",
        body: JSON.stringify({
          originLat: values.origemLat,
          originLng: values.origemLng,
          destLat: values.destinoLat,
          destLng: values.destinoLng,
          departureTime,
          vehicleId: values.vehicleId,
          seats: values.lugares,
        }),
      });
      setRouteOptions(routes);
      // Selecionar automaticamente a primeira rota
      if (routes.length > 0) {
        const first = routes[0];
        setSelectedRouteId(first.routeId);
        setValues((prev) => ({
          ...prev,
          price: centsToEuros(first.breakdown.pricePerSeatCents),
          routeDistanceKm: first.distanceKm,
          routeDurationMin: first.durationMin,
          routeTollCostCents: first.tollCostCents,
          platformFeeCents: first.breakdown.platformFeeCents,
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("GOOGLE_MAPS_API_KEY")) {
        setPricingError("API de rotas não configurada. Define um preço manualmente.");
      } else {
        setPricingError("Não foi possível calcular a rota. Define um preço manualmente.");
      }
      setRouteOptions([]);
    } finally {
      setPricingLoading(false);
    }
  }, [
    canCalculate,
    values.origemLat,
    values.origemLng,
    values.destinoLat,
    values.destinoLng,
    values.vehicleId,
    values.data,
    values.hora,
    values.lugares,
  ]);

  useEffect(() => {
    if (!canCalculate) {
      setRouteOptions([]);
      setSelectedRouteId(null);
      return;
    }
    if (pricingDebounce.current) clearTimeout(pricingDebounce.current);
    pricingDebounce.current = setTimeout(fetchRoutes, 800);
    return () => {
      if (pricingDebounce.current) clearTimeout(pricingDebounce.current);
    };
  }, [canCalculate, fetchRoutes]);

  const selectedRoute = routeOptions.find((r) => r.routeId === selectedRouteId) ?? null;

  const handleSelectRoute = (route: RouteOption) => {
    setSelectedRouteId(route.routeId);
    setValues((prev) => ({
      ...prev,
      price: centsToEuros(route.breakdown.pricePerSeatCents),
      routeDistanceKm: route.distanceKm,
      routeDurationMin: route.durationMin,
      routeTollCostCents: route.tollCostCents,
      platformFeeCents: route.breakdown.platformFeeCents,
    }));
  };

  const set = <K extends keyof OfferRideFormValues>(key: K, val: OfferRideFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const setPref = (key: keyof OfferRideFormValues["preferencias"], val: boolean) => {
    setValues((prev) => ({ ...prev, preferencias: { ...prev.preferencias, [key]: val } }));
  };

  const setTouchedField = (name: string) => setTouched((prev) => ({ ...prev, [name]: true }));

  const priceExceedsCeiling =
    values.price != null &&
    selectedRoute != null &&
    eurosToCents(values.price) > selectedRoute.breakdown.suggestedMaxPriceCents;

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!values.vehicleId) e.vehicleId = "Seleciona um carro";
    if (!values.origem.trim()) e.origem = "Obrigatório";
    if (!values.destino.trim()) e.destino = "Obrigatório";
    if (!values.data) e.data = "Obrigatório";
    if (!values.hora) e.hora = "Obrigatório";
    if (!Number.isFinite(values.lugares) || values.lugares < 1) e.lugares = "Mínimo 1";
    else if (values.lugares > 6) e.lugares = "Máximo 6";
    if (values.aceitaDesvios && (values.desvioMaxMin < 0 || values.desvioMaxMin > 60)) e.desvioMaxMin = "0–60 min";
    if (priceExceedsCeiling) e.price = `Máx. permitido: €${centsToFixed(selectedRoute!.breakdown.suggestedMaxPriceCents)} (+20% sobre custo real)`;
    return e;
  }, [values, priceExceedsCeiling, selectedRoute]);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (Object.keys(errors).length > 0) {
      setTouched({ vehicleId: true, origem: true, destino: true, data: true, hora: true, lugares: true, desvioMaxMin: true, price: true });
      return;
    }
    onSubmit(values);
  };

  const id = useId();

  if (!hasVehicles) {
    return (
      <div className="grid gap-4 p-4 text-center">
        <p className="text-base font-semibold text-[#1A1C19]">Precisas de um veículo associado</p>
        <p className="text-sm text-[#414844]">
          Adiciona um carro em Perfil &gt; Veículos para poderes publicar boleias e calcular custos.
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={() => { onCancel(); onRequireVehicleSetup?.(); }}>
          Ir para Perfil
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-1">
      {/* Veículo: só mostrar seletor quando há mais de 1 carro */}
      {vehicles.length > 1 && (
        <div className="rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#717973] mb-2">Selecionar veículo</p>
          <div className="grid gap-2">
            {vehicles.map((vehicle) => {
              const isSelected = vehicle.id === values.vehicleId;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-2 text-left transition",
                    isSelected
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-50"
                      : "border-[#e7e9e4] bg-[#f3f4ef] text-[#414844] hover:bg-[#f3f4ef]"
                  )}
                  aria-pressed={isSelected}
                  onClick={() => { set("vehicleId", vehicle.id); setTouchedField("vehicleId"); setActiveVehicle(vehicle.id); }}
                >
                  <div>
                    <p className="text-sm font-semibold">{vehicle.brand}</p>
                    <p className="text-xs text-[#414844]">{vehicle.model}</p>
                  </div>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[11px]", isSelected ? "border-emerald-300 bg-emerald-400 text-emerald-900" : "border-[#c1c8c2] text-[#717973]")}>
                    {isSelected ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {touched.vehicleId && errors.vehicleId && <div className="mt-2 text-xs text-red-300">{errors.vehicleId}</div>}
        </div>
      )}

      {/* Origem */}
      <div>
        <label htmlFor={`${id}-origem`} className="block text-xs font-semibold text-[#414844] mb-1">De onde?</label>
        <LocationInput
          id={`${id}-origem`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-white text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10 placeholder:text-[#1A1C19]/40"
          placeholder="Ex.: Estoril, estação, rua…"
          value={values.origem}
          lat={values.origemLat}
          lng={values.origemLng}
          onLabelChange={(label) => setValues((prev) => ({ ...prev, origem: label, origemLat: undefined, origemLng: undefined }))}
          onLocationSelect={(loc) => setValues((prev) => ({ ...prev, origem: loc.label, origemLat: loc.lat, origemLng: loc.lng }))}
          onBlur={() => setTouchedField("origem")}
          aria-invalid={!!errors.origem}
        />
        {touched.origem && errors.origem && <div className="text-xs text-red-300 mt-1">{errors.origem}</div>}
      </div>

      {/* Destino */}
      <div>
        <label htmlFor={`${id}-destino`} className="block text-xs font-semibold text-[#414844] mb-1">Para onde?</label>
        <LocationInput
          id={`${id}-destino`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-white text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10 placeholder:text-[#1A1C19]/40"
          placeholder="Ex.: Lisboa, campus, morada…"
          value={values.destino}
          lat={values.destinoLat}
          lng={values.destinoLng}
          onLabelChange={(label) => setValues((prev) => ({ ...prev, destino: label, destinoLat: undefined, destinoLng: undefined }))}
          onLocationSelect={(loc) => setValues((prev) => ({ ...prev, destino: loc.label, destinoLat: loc.lat, destinoLng: loc.lng }))}
          onBlur={() => setTouchedField("destino")}
          aria-invalid={!!errors.destino}
        />
        {touched.destino && errors.destino && <div className="text-xs text-red-600 mt-1">{errors.destino}</div>}
      </div>

      {/* Dia + Hora */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-data`} className="block text-xs font-semibold text-[#414844] mb-1">Dia</label>
          <input
            id={`${id}-data`}
            className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-white text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10"
            type="date"
            value={values.data}
            onChange={(e) => set("data", e.target.value)}
            onBlur={() => setTouchedField("data")}
            aria-invalid={!!errors.data}
          />
          {touched.data && errors.data && <div className="text-xs text-red-600 mt-1">{errors.data}</div>}
        </div>
        <div>
          <TimePicker
            label="Hora de partida"
            value={values.hora}
            onChange={(v) => { set("hora", v); setTouchedField("hora"); }}
          />
          {touched.hora && errors.hora && <div className="text-xs text-red-600 mt-1">{errors.hora}</div>}
        </div>
      </div>

      {/* Lugares */}
      <div>
        <label htmlFor={`${id}-lugares`} className="block text-xs font-semibold text-[#414844] mb-1">Lugares disponíveis</label>
        <input
          id={`${id}-lugares`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-white text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10"
          type="number"
          min={1}
          max={6}
          value={values.lugares}
          onChange={(e) => {
            const n = Number(e.target.value);
            set("lugares", Number.isNaN(n) ? 0 : n);
          }}
          onBlur={() => setTouchedField("lugares")}
          aria-invalid={!!errors.lugares}
        />
        {touched.lugares && errors.lugares && <div className="text-xs text-red-600 mt-1">{errors.lugares}</div>}
      </div>

      {/* Calculadora de custo -Rotas reais */}
      <div className="rounded-2xl border border-[#e7e9e4] bg-[#f3f4ef] p-4 grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#717973]">Custo da viagem</p>

        {!canCalculate && (
          <p className="text-xs text-[#717973]">
            Preenche origem, destino, data, hora e lugares para calcular o custo real com base no teu veículo.
          </p>
        )}

        {canCalculate && pricingLoading && (
          <div className="flex items-center gap-2 text-sm text-[#717973]">
            <span className="animate-spin text-base">⟳</span>
            A calcular rotas e preços...
          </div>
        )}

        {canCalculate && pricingError && !pricingLoading && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {pricingError}
          </p>
        )}

        {routeOptions.length > 0 && !pricingLoading && (
          <div className="grid gap-2">
            {routeOptions.map((route) => {
              const isSelected = route.routeId === selectedRouteId;
              return (
                <button
                  key={route.routeId}
                  type="button"
                  onClick={() => handleSelectRoute(route)}
                  className={cn(
                    "text-left rounded-xl border px-4 py-3 transition",
                    isSelected
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-[#e7e9e4] bg-white hover:bg-[#f3f4ef]"
                  )}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        isSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#c1c8c2] text-[#717973]"
                      )}>
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="text-sm font-semibold text-[#1A1C19]">{route.label}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">
                      €{centsToFixed(route.breakdown.pricePerSeatCents)}<span className="text-xs font-normal text-[#717973]">/lugar</span>
                    </span>
                  </div>
                  <div className="mt-1.5 pl-6 grid gap-1 text-xs text-[#717973]">
                    <span>{route.distanceKm} km · {route.durationMin} min com tráfego</span>
                    {route.tollCostCents > 0 && (
                      <span>Portagens: €{centsToFixed(route.tollCostCents)}</span>
                    )}
                    <span>
                      Combustível: €{centsToFixed(route.breakdown.fuelCostCents)} · Taxa HopOn: €{centsToFixed(route.breakdown.platformFeeCents)} · Passageiro paga: <strong className="text-[#414844]">€{centsToFixed(route.breakdown.passengerPaysCents)}</strong>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Preço final (editável) */}
        <div>
          <label htmlFor={`${id}-price`} className="block text-xs font-semibold text-[#414844] mb-1">
            Preço por lugar (€)
            {selectedRoute && (
              <span className="ml-1 font-normal text-[#717973]">
                - máx. €{centsToFixed(selectedRoute.breakdown.suggestedMaxPriceCents)}
              </span>
            )}
          </label>
          <input
            id={`${id}-price`}
            type="number"
            min="0"
            step="0.10"
            className={cn(
              "w-full px-3 py-2.5 border bg-white text-[#1A1C19] rounded-xl outline-none focus:ring-2 focus:ring-[#1B4332]/10",
              touched.price && errors.price
                ? "border-red-400 focus:border-red-400"
                : "border-[#e7e9e4] focus:border-[#1B4332]"
            )}
            placeholder={selectedRoute ? `Sugestão: €${centsToFixed(selectedRoute.breakdown.pricePerSeatCents)}` : "0.00"}
            value={values.price ?? ""}
            onChange={(e) => set("price", e.target.value !== "" ? Number(e.target.value) : undefined)}
            onBlur={() => setTouchedField("price")}
          />
          {touched.price && errors.price && (
            <p className="text-xs text-red-600 mt-1">{errors.price}</p>
          )}
          {!errors.price && (
            <p className="text-xs text-[#717973] mt-1">
              Este valor é partilha de custo, não lucro. Cada passageiro paga este valor mais a taxa HopOn.
            </p>
          )}
        </div>
      </div>

      {/* Aceita desvios */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">Reserva instantânea</label>
          <div className="flex items-center gap-2">
            <input
              id={`${id}-instant`}
              type="checkbox"
              className="w-4 h-4 rounded border-white/30 bg-white"
              checked={values.instantBooking}
              onChange={(e) => set("instantBooking", e.target.checked)}
            />
            <label htmlFor={`${id}-instant`} className="text-sm font-medium text-[#1A1C19]">
              {values.instantBooking ? "Sim - passageiros na rota confirmados automaticamente" : "Não - aceito manualmente cada pedido"}
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">Aceita desvios?</label>
          <div className="flex items-center gap-2">
            <input
              id={`${id}-aceita`}
              type="checkbox"
              className="w-4 h-4 rounded border-white/30 bg-white"
              checked={values.aceitaDesvios}
              onChange={(e) => set("aceitaDesvios", e.target.checked)}
            />
            <label htmlFor={`${id}-aceita`} className="text-sm font-medium text-[#1A1C19]" aria-live="polite">
              {values.aceitaDesvios ? "Sim" : "Não"}
            </label>
          </div>
        </div>
      </div>

      {values.aceitaDesvios && (
        <div>
          <label htmlFor={`${id}-desvio`} className="block text-xs font-semibold text-[#414844] mb-1">Desvio máx. (min)</label>
          <input
            id={`${id}-desvio`}
            className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-white rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10"
            type="range"
            min={0}
            max={60}
            step={5}
            value={values.desvioMaxMin}
            onChange={(e) => set("desvioMaxMin", Number(e.target.value))}
            onBlur={() => setTouchedField("desvioMaxMin")}
            aria-valuemin={0}
            aria-valuemax={60}
            aria-valuenow={values.desvioMaxMin}
          />
          <div className="text-xs text-[#717973] mt-1">{values.desvioMaxMin} min</div>
          {touched.desvioMaxMin && errors.desvioMaxMin && <div className="text-xs text-red-600 mt-1">{errors.desvioMaxMin}</div>}
        </div>
      )}

      {/* Ponto de encontro */}
      <div>
        <label htmlFor={`${id}-ponto`} className="block text-xs font-semibold text-[#414844] mb-1">Ponto de encontro</label>
        <input
          id={`${id}-ponto`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-white text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10 placeholder:text-[#1A1C19]/40"
          placeholder="Ex.: estação de Cascais, portaria, etc."
          value={values.pontoEncontro}
          onChange={(e) => set("pontoEncontro", e.target.value)}
        />
      </div>

      {/* Recorrente */}
      <div>
        <label className="block text-xs font-semibold text-[#414844] mb-1">Recorrente</label>
        <div className="flex items-center gap-2 mb-2">
          <input
            id={`${id}-recorrente`}
            type="checkbox"
            className="w-4 h-4 rounded border-white/30 bg-white"
            checked={values.recorrente}
            onChange={(e) => set("recorrente", e.target.checked)}
          />
          <label htmlFor={`${id}-recorrente`} className="text-sm font-medium text-[#1A1C19]" aria-live="polite">
            {values.recorrente ? "Sim" : "Não"}
          </label>
        </div>
        {values.recorrente && (
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Dias da semana">
            {(["seg", "ter", "qua", "qui", "sex"] as const).map((d) => {
              const checked = values.diasSemana.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    checked
                      ? "bg-[#1B4332] text-white border-transparent"
                      : "bg-white text-[#414844] border-[#e7e9e4] hover:bg-[#f3f4ef]"
                  )}
                  aria-pressed={checked}
                  onClick={() => {
                    setValues((prev) => {
                      const has = prev.diasSemana.includes(d);
                      const dias = has ? prev.diasSemana.filter((x) => x !== d) : [...prev.diasSemana, d];
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

      {/* Observações */}
      <div>
        <label htmlFor={`${id}-obs`} className="block text-xs font-semibold text-[#414844] mb-1">Observações</label>
        <textarea
          id={`${id}-obs`}
          className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-white text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10 resize-none placeholder:text-[#1A1C19]/40"
          rows={3}
          placeholder="Ex.: trago mochila grande, prefiro silêncio, etc."
          value={values.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
        />
      </div>

      {/* Preferências */}
      <fieldset aria-label="Preferências">
        <legend className="block text-xs font-semibold text-[#414844] mb-1">Preferências</legend>
        {(
          [
            { key: "musica", label: "Música" },
            { key: "falar", label: "Conversa" },
            { key: "bagagem", label: "Espaço para bagagem" },
            { key: "animais", label: "Aceita animais" },
          ] as const
        ).map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm text-[#1A1C19]">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-white/30 bg-white"
              checked={values.preferencias[key]}
              onChange={(e) => setPref(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {/* Boleia privada para comunidade */}
      {communities.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-[#414844] mb-1">Visibilidade</label>
          <select
            className="w-full px-3 py-2.5 border border-[#e7e9e4] bg-white text-[#1A1C19] rounded-xl outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10 text-sm"
            value={values.communityId ?? ""}
            onChange={(e) => set("communityId", e.target.value || undefined)}
          >
            <option value="">Pública - visível a todos</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>Privada - só para {c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" type="button" onClick={onCancel}>Cancelar</Button>
        <Button variant="outline" className="flex-1" type="submit">Publicar</Button>
      </div>
    </form>
  );
}
