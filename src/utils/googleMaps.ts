/// <reference types="@types/google.maps" />
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

let _promise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (!GOOGLE_KEY) return Promise.reject(new Error("VITE_GOOGLE_MAPS_KEY não configurada"));
  if (!_promise) {
    setOptions({ key: GOOGLE_KEY, v: "weekly", language: "pt" });
    _promise = Promise.all([
      importLibrary("places"),
      importLibrary("geocoding"),
    ]).then(() => {});
  }
  return _promise;
}

export type PlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export async function getPlaceSuggestions(
  query: string,
  proximity?: { lat: number; lng: number }
): Promise<PlaceSuggestion[]> {
  if (!GOOGLE_KEY || query.trim().length < 2) return [];
  await loadGoogleMaps();
  try {
    // Nova API (Places API New) — obrigatória para novos clientes desde março 2025
    const { AutocompleteSuggestion } = await google.maps.importLibrary("places") as any;
    const request: any = {
      input: query,
      includedRegionCodes: ["pt"],
      language: "pt",
      ...(proximity && {
        locationBias: { center: { lat: proximity.lat, lng: proximity.lng }, radius: 50000 },
      }),
    };
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    return suggestions.map((s: any) => ({
      placeId: s.placePrediction.placeId,
      mainText: s.placePrediction.mainText?.toString() ?? "",
      secondaryText: s.placePrediction.secondaryText?.toString() ?? "",
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    await loadGoogleMaps();
    return new Promise((resolve) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng }, language: "pt" } as any, (results, status) => {
        if (status === "OK" && results?.[0]) {
          resolve(results[0].formatted_address);
        } else {
          resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      });
    });
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export async function getPlaceCoords(
  placeId: string
): Promise<{ lat: number; lng: number } | null> {
  await loadGoogleMaps();
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      } else {
        resolve(null);
      }
    });
  });
}
