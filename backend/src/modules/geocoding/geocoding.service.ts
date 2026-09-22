import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeoCoords {
  lat: number;
  lng: number;
}

/** Decode Google's encoded polyline format into an array of coordinates. */
function decodePolyline(encoded: string): GeoCoords[] {
  const points: GeoCoords[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

@Injectable()
export class GeocodingService {
  constructor(private readonly config: ConfigService) {}

  /** Geocodifica texto via Google Geocoding API. Retorna null se falhar. */
  async geocodeText(text: string): Promise<GeoCoords | null> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return null;

    try {
      const params = new URLSearchParams({
        address: text,
        region: 'pt',
        language: 'pt',
        key: apiKey,
      });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      );
      if (!res.ok) return null;

      const data: {
        status: string;
        results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      } = await res.json();

      if (data.status !== 'OK' || data.results.length === 0) return null;
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    } catch {
      return null;
    }
  }

  /**
   * Obtém a polilinha de uma rota via Google Directions API.
   * Retorna array de {lat,lng} já descodificado, ou null se falhar.
   * Usar apenas uma vez por rota - guardar resultado na DB para não re-chamar.
   */
  /**
   * Calcula duração a pé entre dois pontos via Google Directions API (mode: walking).
   * Retorna minutos arredondados para cima, ou null se falhar.
   */
  async getWalkingDuration(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<number | null> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return null;

    try {
      const params = new URLSearchParams({
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        mode: 'walking',
        region: 'pt',
        key: apiKey,
      });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params}`,
      );
      if (!res.ok) return null;

      const data: {
        status: string;
        routes: Array<{ legs: Array<{ duration: { value: number } }> }>;
      } = await res.json();

      if (data.status !== 'OK' || data.routes.length === 0) return null;
      return Math.ceil(data.routes[0].legs[0].duration.value / 60);
    } catch {
      return null;
    }
  }

  /**
   * Obtém a polilinha de uma rota via Google Directions API.
   * Retorna array de {lat,lng} já descodificado, ou null se falhar.
   * Usar apenas uma vez por rota - guardar resultado na DB para não re-chamar.
   */
  async getRoutePolyline(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<GeoCoords[] | null> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return null;

    try {
      const params = new URLSearchParams({
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        mode: 'driving',
        region: 'pt',
        language: 'pt',
        key: apiKey,
      });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params}`,
      );
      if (!res.ok) return null;

      const data: {
        status: string;
        routes: Array<{ overview_polyline: { points: string } }>;
      } = await res.json();

      if (data.status !== 'OK' || data.routes.length === 0) return null;
      return decodePolyline(data.routes[0].overview_polyline.points);
    } catch {
      return null;
    }
  }
}
