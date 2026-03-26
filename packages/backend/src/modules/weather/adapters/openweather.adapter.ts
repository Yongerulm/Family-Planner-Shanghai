import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WeatherAdapter, WeatherData } from './weather.adapter';

@Injectable()
export class OpenWeatherAdapter extends WeatherAdapter {
  readonly name = 'openweather';
  private readonly logger = new Logger(OpenWeatherAdapter.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.get<string>('OPENWEATHER_API_KEY');
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async fetchCurrent(lat: number, lon: number): Promise<WeatherData> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;

    const response = await axios.get(url, { timeout: 10_000 });
    const d = response.data;

    return {
      temperature: d.main.temp,
      feelsLike: d.main.feels_like ?? null,
      humidity: d.main.humidity ?? null,
      windSpeed: d.wind?.speed != null ? d.wind.speed * 3.6 : null, // m/s → km/h
      windDirection: d.wind?.deg ?? null,
      pressure: d.main.pressure ?? null,
      condition: d.weather?.[0]?.description ?? null,
      conditionCode: d.weather?.[0]?.id ?? null,
      iconCode: d.weather?.[0]?.icon ?? null,
      precipitation: d.rain?.['1h'] ?? d.snow?.['1h'] ?? null,
      uvIndex: null, // requires separate API call for OpenWeather
      aqi: null,
      recordedAt: new Date(d.dt * 1000),
    };
  }
}
