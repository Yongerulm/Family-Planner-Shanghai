import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { WeatherSnapshot } from './entities/weather-snapshot.entity';
import { QWeatherAdapter } from './adapters/qweather.adapter';
import { OpenWeatherAdapter } from './adapters/openweather.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([WeatherSnapshot])],
  controllers: [WeatherController],
  providers: [WeatherService, QWeatherAdapter, OpenWeatherAdapter],
  exports: [WeatherService],
})
export class WeatherModule {}
