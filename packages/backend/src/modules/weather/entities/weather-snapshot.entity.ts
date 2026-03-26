import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('weather_snapshots')
export class WeatherSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  temperature: number; // Celsius

  @Column({ name: 'feels_like', type: 'numeric', precision: 6, scale: 2, nullable: true })
  feelsLike: number | null;

  @Column({ type: 'integer', nullable: true })
  humidity: number | null; // %

  @Column({ name: 'wind_speed', type: 'numeric', precision: 6, scale: 2, nullable: true })
  windSpeed: number | null; // km/h

  @Column({ name: 'wind_direction', type: 'integer', nullable: true })
  windDirection: number | null; // degrees

  @Column({ type: 'integer', nullable: true })
  pressure: number | null; // hPa

  @Column({ length: 100, nullable: true })
  condition: string | null; // e.g. 'Partly Cloudy'

  @Column({ name: 'condition_code', type: 'integer', nullable: true })
  conditionCode: number | null;

  @Column({ name: 'icon_code', length: 20, nullable: true })
  iconCode: string | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  precipitation: number | null; // mm

  @Column({ name: 'uv_index', type: 'integer', nullable: true })
  uvIndex: number | null;

  @Column({ name: 'aqi', type: 'integer', nullable: true })
  aqi: number | null; // Air Quality Index — important for Shanghai

  @Column({ name: 'source', length: 50 })
  source: string; // 'openweather', 'qweather', 'mock'

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
