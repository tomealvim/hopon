import { useEffect, useRef, useState } from "react";

type Suggestion = { label: string; shortName: string; context: string; lat: number; lng: number };

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

  useEffect(() => { setQuery(value); }, [value]);

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
        const items: Suggestion[] = (data.features ?? []).map((f: any) => {
          const parts: string[] = f.place_name.split(", ");
          return {
            label: f.text,
            shortName: f.text,
            context: parts.slice(1).join(", "),
            lat: f.center[1],
            lng: f.center[0],
          };
        });
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 300);
  }

  function handleSelect(s: Suggestion) {
    setQuery(s.shortName);
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
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <input
          id={id}
          className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl pl-8 pr-8 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 placeholder:text-gray-400"
          placeholder={placeholder ?? "Pesquisar localização..."}
          value={query}
          onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            onClick={handleClear}
            tabIndex={-1}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {(loading || (open && suggestions.length > 0)) && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-[100] overflow-hidden">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              A pesquisar...
            </div>
          )}
          {!loading && suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-50 last:border-0"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
            >
              <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-snug">{s.shortName}</p>
                {s.context && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{s.context}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
