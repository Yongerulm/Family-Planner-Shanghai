import {
  Controller, Get, Post, Body, Param, ParseUUIDPipe, UseGuards, ParseIntPipe, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

class UseMediaMinutesDto {
  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  minutes: number;
}

@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('me/stats')
  @ApiOperation({ summary: 'Get my XP stats and level' })
  getMyStats(@CurrentUser() user: JwtPayload) {
    return this.gamificationService.getStats(user.sub);
  }

  @Get('me/badges')
  @ApiOperation({ summary: 'Get my earned badges' })
  getMyBadges(@CurrentUser() user: JwtPayload) {
    return this.gamificationService.getBadges(user.sub);
  }

  @Post('me/media-minutes/use')
  @ApiOperation({ summary: 'Redeem earned media minutes' })
  useMediaMinutes(@Body() dto: UseMediaMinutesDto, @CurrentUser() user: JwtPayload) {
    return this.gamificationService.useMediaMinutes(user.sub, dto.minutes);
  }
}

@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FamilyMemberGuard)
@Controller('families/:familyId/leaderboard')
export class LeaderboardController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get()
  @ApiOperation({ summary: 'Family leaderboard (top 10 by XP)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLeaderboard(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('limit') limit?: string,
  ) {
    return this.gamificationService.getLeaderboard(familyId, limit ? parseInt(limit, 10) : 10);
  }
}
