interface MapQuestGeocodeResponse {
  results: Array<{
    locations: Array<{
      latLng: {
        lat: number;
        lng: number;
      };
      adminArea1: string; // Country
      adminArea3: string; // State
      adminArea4: string; // County
      adminArea5: string; // City
      postalCode: string;
      street: string;
      geocodeQuality: string;
      geocodeQualityCode: string;
    }>;
  }>;
}

interface LocationData {
  latitude: number;
  longitude: number;
  state: string;
  county: string;
  city: string;
  postalCode: string;
  street: string;
  quality: string;
}

export class MapQuestService {
  private apiKey: string;
  private baseUrl = 'http://www.mapquestapi.com/geocoding/v1';

  constructor() {
    if (!process.env.MAPQUEST_API_KEY) {
      throw new Error('MAPQUEST_API_KEY environment variable is required');
    }
    this.apiKey = process.env.MAPQUEST_API_KEY;
  }

  async geocodeAddress(address: string): Promise<LocationData | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.baseUrl}/address?key=${this.apiKey}&location=${encodedAddress}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`MapQuest API error: ${response.statusText}`);
      }

      const data: MapQuestGeocodeResponse = await response.json();
      
      if (!data.results || data.results.length === 0 || !data.results[0].locations || data.results[0].locations.length === 0) {
        return null;
      }

      const location = data.results[0].locations[0];
      
      return {
        latitude: location.latLng.lat,
        longitude: location.latLng.lng,
        state: location.adminArea3,
        county: location.adminArea4,
        city: location.adminArea5,
        postalCode: location.postalCode,
        street: location.street,
        quality: location.geocodeQuality
      };
    } catch (error) {
      console.error('MapQuest geocoding error:', error);
      return null;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<LocationData | null> {
    try {
      const url = `${this.baseUrl}/reverse?key=${this.apiKey}&location=${latitude},${longitude}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`MapQuest API error: ${response.statusText}`);
      }

      const data: MapQuestGeocodeResponse = await response.json();
      
      if (!data.results || data.results.length === 0 || !data.results[0].locations || data.results[0].locations.length === 0) {
        return null;
      }

      const location = data.results[0].locations[0];
      
      return {
        latitude,
        longitude,
        state: location.adminArea3,
        county: location.adminArea4,
        city: location.adminArea5,
        postalCode: location.postalCode,
        street: location.street,
        quality: location.geocodeQuality
      };
    } catch (error) {
      console.error('MapQuest reverse geocoding error:', error);
      return null;
    }
  }

  async validateAddress(address: string): Promise<{ isValid: boolean; suggestion?: string; location?: LocationData }> {
    try {
      const location = await this.geocodeAddress(address);
      
      if (!location) {
        return { isValid: false };
      }

      // Consider high-quality geocodes as valid
      const isValid = ['POINT', 'ADDRESS', 'INTERSECTION'].includes(location.quality);
      
      return {
        isValid,
        suggestion: isValid ? undefined : `${location.street}, ${location.city}, ${location.state} ${location.postalCode}`,
        location
      };
    } catch (error) {
      console.error('MapQuest address validation error:', error);
      return { isValid: false };
    }
  }

  async findNearbyElections(latitude: number, longitude: number, radiusMiles: number = 50): Promise<LocationData[]> {
    try {
      // This would typically involve a spatial query against the elections database
      // For now, we'll return the reverse geocoded location
      const location = await this.reverseGeocode(latitude, longitude);
      return location ? [location] : [];
    } catch (error) {
      console.error('MapQuest nearby elections error:', error);
      return [];
    }
  }
}

export const mapQuestService = new MapQuestService();