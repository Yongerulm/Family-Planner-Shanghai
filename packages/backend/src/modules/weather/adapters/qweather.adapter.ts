import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WeatherAdapter, WeatherData } from './weather.adapter';

/**
 * QWeather (和风天气) adapter — China-native weather service.
 * Preferred adapter when QWEATHER_API_KEY is configured.
 * API docs: https://dev.qweather.com/en/docs/api/
 */
@Injectable()
export class QWeatherAdapter extends WeatherAdapter {
  readonly name = 'qweather';
  private readonly logger = new Logger(QWeatherAdapter.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.get<string>('QWEATHER_API_KEY');
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async fetchCurrent(lat: number, lon: number): Promise<WeatherData> {
    const baseUrl = 'https://devapi.qweather.com/v7';
    const params = { location: `${lon},${lat}`, key: this.apiKey };

    const [nowRes, airRes] = await Promise.allSettled([
      axios.get(`${baseUrl}/weather/now`, { params, timeout: 10_000 }),
      axios.get(`${baseUrl}/air/now`, { params, timeout: 10_000 }),
    ]);

    const now = nowRes.status === 'fulfilled' ? nowRes.value.data?.now : null;
    const air = airRes.status === 'fulfilled' ? airRes.value.data?.now : null;

    if (!now) throw new Error('QWeather current weather fetch failed');

    return {
      temperature: parseFloat(now.temp),
      feelsLike: now.feelsLike ? parseFloat(now.feelsLike) : null,
      humidity: now.humidity ? parseInt(now.humidity, 10) : null,
      windSpeed: now.windSpeed ? parseFloat(now.windSpeed) : null,
      windDirection: now.wind360 ? parseInt(now.wind360, 10) : null,
      pressure: now.pressure ? parseInt(now.pressure, 10) : null,
      condition: now.text ?? null,
      conditionCode: now.icon ? parseInt(now.icon, 10) : null,
      iconCode: now.icon ?? null,
      precipitation: now.precip ? parseFloat(now.precip) : null,
      uvIndex: now.uvIndex ? parseInt(now.uvIndex, 10) : null,
      aqi: air?.aqi ? parseInt(air.aqi, 10) : null,
      recordedAt: now.obsTime ? new Date(now.obsTime) : new Date(),
    };
  }
}
