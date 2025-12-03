interface CensusApiResponse {
  data: any[];
  error?: string;
}

interface ElectionDistrict {
  state: string;
  district: string;
  population: number;
  demographics: {
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    other: number;
  };
}

export class CensusService {
  private apiKey: string;
  private baseUrl = 'https://api.census.gov/data';

  constructor() {
    this.apiKey = process.env.CENSUS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Census API key not found. Some features may be limited.');
    }
  }

  async getCongressionalDistricts(): Promise<ElectionDistrict[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/2022/acs/acs5?get=NAME,B01003_001E,B02001_002E,B02001_003E,B03003_003E,B02001_005E&for=congressional%20district:*&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Census API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.parseDistrictData(data);
    } catch (error) {
      console.error('Error fetching congressional districts:', error);
      return [];
    }
  }

  async getStatePopulations(): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/2022/acs/acs5?get=NAME,B01003_001E&for=state:*&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Census API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseStateData(data);
    } catch (error) {
      console.error('Error fetching state populations:', error);
      return [];
    }
  }

  async getElectionDemographics(state: string, district?: string): Promise<any> {
    try {
      const geo = district 
        ? `congressional%20district:${district}&in=state:${state}`
        : `state:${state}`;

      const response = await fetch(
        `${this.baseUrl}/2022/acs/acs5?get=NAME,B01003_001E,B02001_002E,B02001_003E,B03003_003E,B02001_005E,B25003_002E,B15003_022E&for=${geo}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Census API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseDemographicData(data);
    } catch (error) {
      console.error('Error fetching election demographics:', error);
      return null;
    }
  }

  private parseDistrictData(data: any[]): ElectionDistrict[] {
    if (!data || data.length < 2) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const district: any = {};
      headers.forEach((header: string, index: number) => {
        district[header] = row[index];
      });

      return {
        state: district.state,
        district: district['congressional district'],
        population: parseInt(district.B01003_001E || '0'),
        demographics: {
          white: parseInt(district.B02001_002E || '0'),
          black: parseInt(district.B02001_003E || '0'),
          hispanic: parseInt(district.B03003_003E || '0'),
          asian: parseInt(district.B02001_005E || '0'),
          other: 0
        }
      };
    });
  }

  private parseStateData(data: any[]): any[] {
    if (!data || data.length < 2) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const state: any = {};
      headers.forEach((header: string, index: number) => {
        state[header] = row[index];
      });
      return state;
    });
  }

  private parseDemographicData(data: any[]): any {
    if (!data || data.length < 2) return null;

    const headers = data[0];
    const row = data[1];

    const demographics: any = {};
    headers.forEach((header: string, index: number) => {
      demographics[header] = row[index];
    });

    return {
      totalPopulation: parseInt(demographics.B01003_001E || '0'),
      white: parseInt(demographics.B02001_002E || '0'),
      black: parseInt(demographics.B02001_003E || '0'),
      hispanic: parseInt(demographics.B03003_003E || '0'),
      asian: parseInt(demographics.B02001_005E || '0'),
      homeownership: parseInt(demographics.B25003_002E || '0'),
      collegeEducated: parseInt(demographics.B15003_022E || '0')
    };
  }
}

export const censusService = new CensusService();