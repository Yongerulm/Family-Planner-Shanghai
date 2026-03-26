import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationController, LeaderboardController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { XpLedger } from './entities/xp-ledger.entity';
import { UserStats } from './entities/user-stats.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([XpLedger, UserStats, Badge, UserBadge])],
  controllers: [GamificationController, LeaderboardController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
