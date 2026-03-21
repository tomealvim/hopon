import { useEffect, useRef, useState } from "react";

type Suggestion = { label: string; lat: number; lng: number };

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onSelect: (suggestion: Suggestion | null) => void;
  mapboxToken: string;
  id?: string;
};

export default function LocationAutocomplete({ label, placeholder, value, onSelect, mapboxToken, id }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g., clear)
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    // Clear selection when user types
    onSelect(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?country=pt&language=pt&types=place,locality,neighborhood,address&limit=5&access_token=${mapboxToken}`
        );
        const data = await res.json();
        const items: Suggestion[] = (data.features ?? []).map((f: any) => ({
          label: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        }));
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 300);
  }

  function handleSelect(s: Suggestion) {
    setQuery(s.label);
    setSuggestions([]);
    setOpen(false);
    onSelect(s);
  }

  function handleClear() {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    onSelect(null);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 placeholder:text-gray-400 pr-8"
          placeholder={placeholder ?? "Pesquisar localização..."}
          value={query}
          onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={handleClear}
            tabIndex={-1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
      {loading && (
        <p className="absolute left-0 right-0 top-full mt-1 text-xs text-gray-400 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm z-50">
          A pesquisar...
        </p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-start gap-2"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              >
                <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="leading-snug">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
