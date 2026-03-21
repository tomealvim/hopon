import { Loader } from "@googlemaps/js-api-loader";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

let _promise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (!GOOGLE_KEY) return Promise.reject(new Error("VITE_GOOGLE_MAPS_KEY não configurada"));
  if (!_promise) {
    const loader = new Loader({ apiKey: GOOGLE_KEY, version: "weekly", libraries: ["places"] });
    _promise = loader.load().then(() => {});
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
  return new Promise((resolve) => {
    const service = new google.maps.places.AutocompleteService();
    const req: google.maps.places.AutocompletionRequest = {
      input: query,
      componentRestrictions: { country: "pt" },
      language: "pt",
      ...(proximity && {
        location: new google.maps.LatLng(proximity.lat, proximity.lng),
        radius: 50000,
      }),
    };
    service.getPlacePredictions(req, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
        resolve([]);
        return;
      }
      resolve(
        predictions.map((p) => ({
          placeId: p.place_id,
          mainText: p.structured_formatting.main_text,
          secondaryText: p.structured_formatting.secondary_text ?? "",
        }))
      );
    });
  });
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
