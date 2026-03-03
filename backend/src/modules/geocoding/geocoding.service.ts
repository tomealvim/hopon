import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeoCoords {
  lat: number;
  lng: number;
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
}
