export interface WeatherData {
  temperature: number;
  feelsLike: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
  condition: string | null;
  conditionCode: number | null;
  iconCode: string | null;
  precipitation: number | null;
  uvIndex: number | null;
  aqi: number | null;
  recordedAt: Date;
}

export abstract class WeatherAdapter {
  abstract readonly name: string;
  abstract isConfigured(): boolean;
  abstract fetchCurrent(lat: number, lon: number): Promise<WeatherData>;
}
