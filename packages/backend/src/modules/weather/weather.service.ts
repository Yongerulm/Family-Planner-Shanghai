import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { WeatherSnapshot } from './entities/weather-snapshot.entity';
import { WeatherAdapter } from './adapters/weather.adapter';
import { QWeatherAdapter } from './adapters/qweather.adapter';
import { OpenWeatherAdapter } from './adapters/openweather.adapter';

// Default coordinates: Shanghai Puxi
const DEFAULT_LAT = 31.2304;
const DEFAULT_LON = 121.4737;

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly adapters: WeatherAdapter[];

  constructor(
    @InjectRepository(WeatherSnapshot)
    private readonly snapshotRepo: Repository<WeatherSnapshot>,
    private readonly qweather: QWeatherAdapter,
    private readonly openweather: OpenWeatherAdapter,
    private readonly config: ConfigService,
  ) {
    // Priority: QWeather first (China-native), then OpenWeather fallback
    this.adapters = [this.qweather, this.openweather].filter((a) => a.isConfigured());
  }

  async getCurrent(familyId: string): Promise<WeatherSnapshot | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.snapshotRepo.findOne({
      where: { familyId, recordedAt: MoreThanOrEqual(oneHourAgo) },
      order: { recordedAt: 'DESC' },
    });
  }

  async getHistory(familyId: string, hours = 24): Promise<WeatherSnapshot[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.snapshotRepo.find({
      where: { familyId, recordedAt: MoreThanOrEqual(since) },
      order: { recordedAt: 'DESC' },
    });
  }

  async fetchAndStore(familyId: string, lat?: number, lon?: number): Promise<WeatherSnapshot | null> {
    const resolvedLat = lat ?? parseFloat(this.config.get('WEATHER_LAT') ?? String(DEFAULT_LAT));
    const resolvedLon = lon ?? parseFloat(this.config.get('WEATHER_LON') ?? String(DEFAULT_LON));

    for (const adapter of this.adapters) {
      try {
        const data = await adapter.fetchCurrent(resolvedLat, resolvedLon);
        const snapshot = this.snapshotRepo.create({
          familyId,
          ...data,
          source: adapter.name,
        });
        return this.snapshotRepo.save(snapshot);
      } catch (err) {
        this.logger.warn(`Weather adapter ${adapter.name} failed: ${(err as Error).message}`);
      }
    }

    this.logger.warn('All weather adapters failed — no data stored');
    return null;
  }

  /**
   * Hourly scheduled fetch for all families.
   * In production, families should have stored coordinates;
   * here we use the global default (configurable per-family in a future iteration).
   */
  @Cron('0 * * * *') // every hour on the hour
  async scheduledFetch(): Promise<void> {
    // Collect distinct family IDs that have recent activity (via any module)
    // For now, fetch for all families found in snapshots or use env-configured default
    const distinctFamilies = await this.snapshotRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.family_id', 'familyId')
      .getRawMany<{ familyId: string }>();

    for (const { familyId } of distinctFamilies) {
      await this.fetchAndStore(familyId).catch((e) =>
        this.logger.error(`Scheduled fetch failed for family ${familyId}: ${(e as Error).message}`),
      );
    }
  }

  async pruneOldSnapshots(keepDays = 7): Promise<void> {
    const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
    await this.snapshotRepo
      .createQueryBuilder()
      .delete()
      .where('recorded_at < :cutoff', { cutoff })
      .execute();
  }
}
