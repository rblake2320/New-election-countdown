import { z } from 'zod';

const locationSchema = z.object({
  latLng: z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) }),
  adminArea3: z.string(), adminArea4: z.string(), adminArea5: z.string(),
  postalCode: z.string(), street: z.string(), geocodeQuality: z.string(),
});
const statusSchema = z.object({ info: z.object({ statuscode: z.number().int() }) });
const resultsSchema = z.object({ results: z.array(z.object({ locations: z.array(z.unknown()) })) });
export interface LocationData {
  latitude: number; longitude: number; state: string; county: string; city: string;
  postalCode: string; street: string; quality: string;
}
export class GeocoderUnavailableError extends Error {
  readonly code = 'geocoder_unavailable';
  constructor(readonly reason: 'not_configured' | 'provider_error' | 'invalid_response') {
    super('Geocoding service temporarily unavailable'); this.name = 'GeocoderUnavailableError';
  }
}
export class GeocoderInputError extends Error {
  readonly code = 'invalid_query';
  constructor() { super('Valid address or coordinates required'); this.name = 'GeocoderInputError'; }
}
export function validGeocodeAddress(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
export function parseGeocodeCoordinates(lat: unknown, lng: unknown): {latitude:number;longitude:number} | null {
  if (typeof lat !== 'string' || typeof lng !== 'string' || !lat.trim() || !lng.trim()) return null;
  const latitude = Number(lat), longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}
export class MapQuestService {
  private readonly apiKey: string | null;
  private readonly baseUrl = 'https://www.mapquestapi.com/geocoding/v1';
  constructor() {
    this.apiKey = process.env.MAPQUEST_API_KEY?.trim() || null;
    if (!this.apiKey) console.warn('MAPQUEST_API_KEY not set — geocoding features disabled');
  }
  get isEnabled(): boolean { return this.apiKey !== null; }
  private async locate(kind: 'address' | 'reverse', input: string): Promise<LocationData | null> {
    if (!this.apiKey) throw new GeocoderUnavailableError('not_configured');
    try {
      const url = new URL(`${this.baseUrl}/${kind}`);
      url.searchParams.set('key', this.apiKey); url.searchParams.set('location', input);
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (response.status === 400) throw new GeocoderInputError();
      if (!response.ok) throw new GeocoderUnavailableError('provider_error');
      const data: unknown = await response.json();
      const status = statusSchema.safeParse(data);
      if (!status.success) throw new GeocoderUnavailableError('invalid_response');
      if (status.data.info.statuscode === 400) throw new GeocoderInputError();
      if (status.data.info.statuscode !== 0) throw new GeocoderUnavailableError('provider_error');
      const result = resultsSchema.safeParse(data);
      if (!result.success) throw new GeocoderUnavailableError('invalid_response');
      // Only a successfully classified response with an explicitly empty list is no-match.
      if (!result.data.results.length || !result.data.results[0].locations.length) return null;
      const parsed = locationSchema.safeParse(result.data.results[0].locations[0]);
      if (!parsed.success) throw new GeocoderUnavailableError('invalid_response');
      const location = parsed.data;
      return { latitude: location.latLng.lat, longitude: location.latLng.lng, state: location.adminArea3,
        county: location.adminArea4, city: location.adminArea5, postalCode: location.postalCode,
        street: location.street, quality: location.geocodeQuality };
    } catch (error) {
      if (error instanceof GeocoderUnavailableError || error instanceof GeocoderInputError) throw error;
      // Never disclose a provider URL/key or label a transport/JSON failure as a nonexistent address.
      throw new GeocoderUnavailableError('provider_error');
    }
  }
  geocodeAddress(address: string): Promise<LocationData | null> {
    if (!validGeocodeAddress(address)) throw new GeocoderInputError();
    return this.locate('address', address.trim());
  }
  async reverseGeocode(latitude: number, longitude: number): Promise<LocationData | null> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new GeocoderInputError();
    const location = await this.locate('reverse', `${latitude},${longitude}`);
    return location ? { ...location, latitude, longitude } : null;
  }
  async validateAddress(address: string): Promise<{isValid:boolean;suggestion?:string;location?:LocationData}> {
    const location = await this.geocodeAddress(address);
    if (!location) return { isValid: false };
    const isValid = ['POINT','ADDRESS','INTERSECTION'].includes(location.quality);
    return { isValid, suggestion: isValid ? undefined : `${location.street}, ${location.city}, ${location.state} ${location.postalCode}`, location };
  }
  async findNearbyElections(latitude: number, longitude: number, radiusMiles = 50): Promise<LocationData[]> {
    const location = await this.reverseGeocode(latitude, longitude);
    return location ? [location] : [];
  }
}
export const mapQuestService = new MapQuestService();
