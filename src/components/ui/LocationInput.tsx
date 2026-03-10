/**
 * LocationInput — campo de texto para localização com autocomplete Mapbox.
 *
 * Requer VITE_MAPBOX_TOKEN no .env do frontend.
 * Se o token não estiver configurado, degrada graciosamente para texto simples.
 *
 * Quando integrar Google Places no futuro (2.1 roadmap note):
 *   - Substituir fetchSuggestions() pela Places Autocomplete API
 *   - O resto do componente (onLocationSelect, LocationValue) mantém-se igual
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import MapPicker from "./MapPicker";

export type LocationValue = {
  label: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  city?: string;
};

type Suggestion = {
  id: string;
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
  city?: string;
};

type LocationInputProps = {
  id?: string;
  className?: string;
  placeholder?: string;
  value: string;
  lat?: number;
  lng?: number;
  /** Chamado quando o utilizador edita manualmente (limpa coordenadas) */
  onLabelChange: (label: string) => void;
  /** Chamado quando uma sugestão é seleccionada — recebe label + coords */
  onLocationSelect?: (location: LocationValue) => void;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const MAPBOX_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

async function fetchSuggestions(query: string): Promise<Suggestion[]> {
  if (!MAPBOX_TOKEN || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    language: "pt",
    country: "pt",
    limit: "5",
    types: "place,locality,neighborhood,address,poi",
  });

  const res = await fetch(`${MAPBOX_URL}/${encodeURIComponent(query)}.json?${params}`);
  if (!res.ok) return [];

  const data: {
    features: Array<{
      id: string;
      place_name: string;
      text: string;
      center: [number, number]; // [lng, lat]
      context?: Array<{ id: string; text: string }>;
    }>;
  } = await res.json();

  return data.features.map((f) => {
    const [lng, lat] = f.center;
    const city = f.context?.find((c) => c.id.startsWith("place."))?.text;
    // Separar label principal do sublabel (ex: "Rua X" / "Lisboa, Portugal")
    const [main, ...rest] = f.place_name.split(", ");
    return {
      id: f.id,
      label: f.place_name,
      sublabel: rest.length > 0 ? rest.join(", ") : undefined,
      mainText: main,
      lat,
      lng,
      city,
    };
  });
}

export function LocationInput({
  id,
  className,
  placeholder,
  value,
  lat,
  lng,
  onLabelChange,
  onLocationSelect,
  onBlur,
  "aria-invalid": ariaInvalid,
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [mapOpen, setMapOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const hasCoords = lat != null && lng != null;
  const autocompleteEnabled = !!MAPBOX_TOKEN;

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(query);
      setSuggestions(results);
      setOpen(true); // abrir sempre que há input (pin no mapa está sempre disponível)
      setActiveIdx(-1);
    }, 300);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onLabelChange(v);
    if (v.trim().length >= 2) {
      if (autocompleteEnabled) search(v);
    } else {
      setSuggestions([]);
      setOpen(v.trim().length === 0 ? false : true);
    }
  };

  const handleSelect = (s: Suggestion) => {
    onLabelChange(s.label);
    onLocationSelect?.({ label: s.label, lat: s.lat, lng: s.lng, placeId: s.id, city: s.city });
    setOpen(false);
    setSuggestions([]);
  };

  const handleMapConfirm = (pickedLat: number, pickedLng: number, pickedLabel: string) => {
    onLabelChange(pickedLabel);
    onLocationSelect?.({ label: pickedLabel, lat: pickedLat, lng: pickedLng });
    setMapOpen(false);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const total = suggestions.length + 1; // +1 para o item "pin no mapa"
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx === 0) {
        setOpen(false);
        setMapOpen(true);
      } else if (activeIdx > 0) {
        handleSelect(suggestions[activeIdx - 1]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const showDropdown = open && !mapOpen;

  return (
    <>
      <div ref={containerRef} className="relative">
        <input
          id={id}
          type="text"
          className={cn(className, hasCoords && "pr-14")}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
              onBlur?.();
            }, 150);
          }}
          onFocus={() => setOpen(true)}
          aria-invalid={ariaInvalid}
          aria-autocomplete={autocompleteEnabled ? "list" : "none"}
          aria-controls={showDropdown ? listId : undefined}
          aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
          autoComplete="off"
        />

        {/* Badge GPS quando há coordenadas guardadas */}
        {hasCoords && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full select-none pointer-events-none"
            title={`${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}
          >
            GPS ✓
          </span>
        )}

        {/* Dropdown */}
        {showDropdown && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          >
            {/* Primeira opção: pin no mapa */}
            <li
              id={`${listId}-0`}
              role="option"
              aria-selected={activeIdx === 0}
              className={cn(
                "flex items-center gap-2.5 px-3 py-3 cursor-pointer text-sm transition-colors border-b border-gray-100",
                activeIdx === 0 ? "bg-gray-50" : "hover:bg-gray-50",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setMapOpen(true);
              }}
              onMouseEnter={() => setActiveIdx(0)}
            >
              <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span>
                <span className="font-semibold text-gray-900 block text-sm">Colocar pin no mapa</span>
                <span className="text-xs text-gray-400">Toca para escolher no mapa</span>
              </span>
            </li>

            {/* Sugestões de texto */}
            {suggestions.map((s, i) => {
              const [main, ...rest] = s.label.split(", ");
              const idx = i + 1; // offset de 1 por causa do item "pin no mapa"
              return (
                <li
                  key={s.id}
                  id={`${listId}-${idx}`}
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2.5 cursor-pointer text-sm transition-colors",
                    idx === activeIdx ? "bg-gray-50" : "text-gray-700 hover:bg-gray-50",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(s);
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <svg className="mt-0.5 shrink-0 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="min-w-0">
                    <span className="font-medium text-gray-900 truncate block">{main}</span>
                    {rest.length > 0 && (
                      <span className="text-xs text-gray-500 truncate block">{rest.join(", ")}</span>
                    )}
                  </span>
                </li>
              );
            })}

            {/* Atribuição obrigatória Mapbox */}
            {suggestions.length > 0 && (
              <li className="px-3 py-1.5 border-t border-gray-100 flex justify-end" aria-hidden>
                <span className="text-[10px] text-gray-400">© Mapbox © OpenStreetMap</span>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Mapa full-screen */}
      <MapPicker
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onConfirm={handleMapConfirm}
        initialLat={lat}
        initialLng={lng}
      />
    </>
  );
}
