/**
 * MapPicker — modal com mapa interativo para o utilizador colocar um pin.
 * Usa Leaflet + OpenStreetMap (sem token necessário).
 * O reverse-geocode usa a API Mapbox já configurada no projeto.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number, label: string) => void;
  /** Posição inicial do pin (ex: localização atual) */
  initialLat?: number;
  initialLng?: number;
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!MAPBOX_TOKEN) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      language: "pt",
      types: "address,place,poi,neighborhood",
      limit: "1",
    });
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`
    );
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data = await res.json();
    return data.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Coordenadas de Lisboa como default
const DEFAULT_LAT = 38.7169;
const DEFAULT_LNG = -9.1399;

export default function MapPicker({ open, onClose, onConfirm, initialLat, initialLng }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [pinLat, setPinLat] = useState(initialLat ?? DEFAULT_LAT);
  const [pinLng, setPinLng] = useState(initialLng ?? DEFAULT_LNG);
  const [label, setLabel] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Inicializar mapa quando abre
  useEffect(() => {
    if (!open || !mapRef.current) return;

    let map: any;
    let marker: any;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix leaflet default icon path
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const startLat = initialLat ?? DEFAULT_LAT;
      const startLng = initialLng ?? DEFAULT_LNG;

      map = L.map(mapRef.current!, {
        center: [startLat, startLng],
        zoom: initialLat ? 15 : 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);

      leafletMap.current = map;
      markerRef.current = marker;

      // Reverse geocode posição inicial
      setPinLat(startLat);
      setPinLng(startLng);
      setGeocoding(true);
      const lbl = await reverseGeocode(startLat, startLng);
      setLabel(lbl);
      setGeocoding(false);

      // Click no mapa move o marcador
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setPinLat(lat);
        setPinLng(lng);
        setGeocoding(true);
        const l = await reverseGeocode(lat, lng);
        setLabel(l);
        setGeocoding(false);
      });

      // Drag do marcador
      marker.on("dragend", async () => {
        const { lat, lng } = marker.getLatLng();
        setPinLat(lat);
        setPinLng(lng);
        setGeocoding(true);
        const l = await reverseGeocode(lat, lng);
        setLabel(l);
        setGeocoding(false);
      });

      // Forçar resize para o mapa renderizar corretamente
      setTimeout(() => map.invalidateSize(), 100);
    }

    init();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleConfirm() {
    setConfirming(true);
    const finalLabel = label || await reverseGeocode(pinLat, pinLng);
    onConfirm(pinLat, pinLng, finalLabel);
    setConfirming(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-600 font-medium"
        >
          Cancelar
        </button>
        <h2 className="text-sm font-bold text-gray-900">Colocar pin no mapa</h2>
        <div className="w-16" />
      </div>

      {/* Instrução */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 shrink-0">
        <p className="text-xs text-gray-500 text-center">
          Toca no mapa ou arrasta o pin para selecionar a localização
        </p>
      </div>

      {/* Mapa */}
      <div ref={mapRef} className="flex-1 w-full" />

      {/* Footer com endereço + confirmar */}
      <div className="px-4 py-4 border-t border-gray-200 bg-white shrink-0 safe-area-bottom">
        <div className="mb-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 min-h-[52px] flex items-center gap-2">
          {geocoding ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              <span className="text-sm text-gray-400">A identificar morada...</span>
            </div>
          ) : (
            <>
              <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-sm text-gray-700 line-clamp-2">{label || "Toca no mapa para selecionar"}</span>
            </>
          )}
        </div>
        <Button
          className="w-full"
          disabled={!label || geocoding || confirming}
          onClick={handleConfirm}
        >
          Confirmar localização
        </Button>
      </div>
    </div>
  );
}
