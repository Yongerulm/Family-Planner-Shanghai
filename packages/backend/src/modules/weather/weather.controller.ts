import {
  Controller, Get, Post, Param, ParseUUIDPipe, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';

@ApiTags('Weather')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FamilyMemberGuard)
@Controller('families/:familyId/weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get latest cached weather snapshot (up to 1 hour old)' })
  getCurrent(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.weatherService.getCurrent(familyId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get weather history for last N hours' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  getHistory(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('hours') hours?: string,
  ) {
    return this.weatherService.getHistory(familyId, hours ? parseInt(hours, 10) : 24);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Force-refresh weather data now' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lon', required: false, type: Number })
  refresh(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
  ) {
    return this.weatherService.fetchAndStore(
      familyId,
      lat ? parseFloat(lat) : undefined,
      lon ? parseFloat(lon) : undefined,
    );
  }
}
