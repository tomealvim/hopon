/**
 * LocationInput — campo de texto para localização com Google Places Autocomplete.
 * Requer VITE_GOOGLE_MAPS_KEY no .env do frontend.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import MapPicker from "./MapPicker";
import { getPlaceSuggestions, getPlaceCoords } from "../../utils/googleMaps";

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

const DEFAULT_PROXIMITY = { lat: 38.7169, lng: -9.1399 }; // Lisboa

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
  const proximityRef = useRef<{ lat: number; lng: number }>(DEFAULT_PROXIMITY);
  const listId = useId();
  const hasCoords = lat != null && lng != null;

  // Obter GPS do utilizador para bias de proximidade
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { proximityRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {},
      { maximumAge: 10 * 60 * 1000, timeout: 3000 }
    );
  }, []);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await getPlaceSuggestions(query, proximityRef.current);
      setSuggestions(results.map((r) => ({ id: r.placeId, label: r.mainText, sublabel: r.secondaryText })));
      setOpen(true);
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
      search(v);
    } else {
      setSuggestions([]);
      setOpen(v.trim().length === 0 ? false : true);
    }
  };

  const handleSelect = async (s: Suggestion) => {
    onLabelChange(s.label);
    setOpen(false);
    setSuggestions([]);
    const coords = await getPlaceCoords(s.id);
    onLocationSelect?.({ label: s.label, lat: coords?.lat, lng: coords?.lng, placeId: s.id });
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
          aria-autocomplete="list"
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
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#e7e9e4] rounded-xl shadow-lg overflow-hidden"
          >
            {/* Primeira opção: pin no mapa */}
            <li
              id={`${listId}-0`}
              role="option"
              aria-selected={activeIdx === 0}
              className={cn(
                "flex items-center gap-2.5 px-3 py-3 cursor-pointer text-sm transition-colors border-b border-[#e7e9e4]",
                activeIdx === 0 ? "bg-[#f3f4ef]" : "hover:bg-[#f3f4ef]",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                setMapOpen(true);
              }}
              onMouseEnter={() => setActiveIdx(0)}
            >
              <div className="w-7 h-7 rounded-lg bg-[#1B4332] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span>
                <span className="font-semibold text-[#1A1C19] block text-sm">Colocar pin no mapa</span>
                <span className="text-xs text-[#717973]">Toca para escolher no mapa</span>
              </span>
            </li>

            {/* Sugestões de texto */}
            {suggestions.map((s, i) => {
              const idx = i + 1; // offset de 1 por causa do item "pin no mapa"
              return (
                <li
                  key={s.id}
                  id={`${listId}-${idx}`}
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2.5 cursor-pointer text-sm transition-colors",
                    idx === activeIdx ? "bg-[#f3f4ef]" : "text-[#414844] hover:bg-[#f3f4ef]",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(s);
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <svg className="mt-0.5 shrink-0 text-[#c1c8c2]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="min-w-0">
                    <span className="font-medium text-[#1A1C19] truncate block">{s.label}</span>
                    {s.sublabel && (
                      <span className="text-xs text-[#717973] truncate block">{s.sublabel}</span>
                    )}
                  </span>
                </li>
              );
            })}

            {/* Atribuição obrigatória Mapbox */}
            {suggestions.length > 0 && (
              <li className="px-3 py-1.5 border-t border-[#e7e9e4] flex justify-end" aria-hidden>
                <span className="text-[10px] text-[#717973]">© Mapbox © OpenStreetMap</span>
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
