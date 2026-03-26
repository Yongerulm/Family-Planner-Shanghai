import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { XpLedger } from './entities/xp-ledger.entity';
import { UserStats } from './entities/user-stats.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';

export interface XpAwardEvent {
  userId: string;
  action: string;
  points: number;
  resourceId?: string;
}

// XP required to reach each level — exponential growth
const XP_PER_LEVEL = (level: number): number => Math.floor(100 * Math.pow(1.5, level - 1));

// Badge triggers: action → badge key
const BADGE_TRIGGERS: Record<string, string[]> = {
  task_done: ['first_task'],
  homework_done: ['first_homework'],
};

// Streak-based badges
const STREAK_BADGES: Record<number, string> = {
  3: 'streak_3',
  7: 'streak_7',
  30: 'streak_30',
};

// Media minutes awarded per XP milestone
const MEDIA_MINUTES_PER_100_XP = 10;

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    @InjectRepository(XpLedger)
    private readonly ledgerRepo: Repository<XpLedger>,
    @InjectRepository(UserStats)
    private readonly statsRepo: Repository<UserStats>,
    @InjectRepository(Badge)
    private readonly badgeRepo: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepo: Repository<UserBadge>,
  ) {}

  @OnEvent('gamification.xp.award')
  async handleXpAward(event: XpAwardEvent): Promise<void> {
    try {
      await this.awardXp(event.userId, event.action, event.points, event.resourceId);
    } catch (err) {
      this.logger.error(`Failed to award XP: ${(err as Error).message}`, { userId: event.userId });
    }
  }

  async awardXp(
    userId: string,
    action: string,
    points: number,
    resourceId?: string,
  ): Promise<UserStats> {
    // Record ledger entry
    await this.ledgerRepo.save(
      this.ledgerRepo.create({ userId, action, points, resourceId: resourceId ?? null }),
    );

    // Get or create stats
    let stats = await this.statsRepo.findOne({ where: { userId } });
    if (!stats) {
      stats = this.statsRepo.create({ userId, totalXp: 0, level: 1 });
    }

    const previousXp = stats.totalXp;
    stats.totalXp += points;

    // Level up check
    let xpForNextLevel = XP_PER_LEVEL(stats.level + 1);
    while (stats.totalXp >= xpForNextLevel) {
      stats.level += 1;
      xpForNextLevel = XP_PER_LEVEL(stats.level + 1);
    }

    // Media minutes: earn 10 min per 100 XP crossed
    const prevHundreds = Math.floor(previousXp / 100);
    const newHundreds = Math.floor(stats.totalXp / 100);
    if (newHundreds > prevHundreds) {
      stats.mediaMinutesEarned += (newHundreds - prevHundreds) * MEDIA_MINUTES_PER_100_XP;
    }

    // Streak update
    const today = new Date().toISOString().slice(0, 10);
    if (stats.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (stats.lastActiveDate === yesterday) {
        stats.currentStreak += 1;
      } else {
        stats.currentStreak = 1;
      }
      stats.lastActiveDate = today;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
      await this.checkStreakBadges(userId, stats.currentStreak);
    }

    await this.statsRepo.save(stats);

    // Check action-based badges
    await this.checkActionBadges(userId, action);

    return stats;
  }

  async getStats(userId: string): Promise<UserStats | null> {
    return this.statsRepo.findOne({ where: { userId } });
  }

  async getBadges(userId: string): Promise<UserBadge[]> {
    return this.userBadgeRepo.find({
      where: { userId },
      order: { earnedAt: 'DESC' },
    });
  }

  async getLeaderboard(familyId: string, limit = 10): Promise<UserStats[]> {
    // Join through user → family membership
    return this.statsRepo
      .createQueryBuilder('s')
      .innerJoin('user_family_roles', 'ufr', 'ufr.user_id = s.user_id AND ufr.family_id = :familyId', { familyId })
      .orderBy('s.total_xp', 'DESC')
      .limit(limit)
      .getMany();
  }

  async useMediaMinutes(userId: string, minutes: number): Promise<UserStats> {
    const stats = await this.statsRepo.findOneByOrFail({ userId });
    const available = stats.mediaMinutesEarned - stats.mediaMinutesUsed;
    const toUse = Math.min(minutes, available);
    stats.mediaMinutesUsed += toUse;
    return this.statsRepo.save(stats);
  }

  private async checkActionBadges(userId: string, action: string): Promise<void> {
    const keys = BADGE_TRIGGERS[action];
    if (!keys?.length) return;

    for (const key of keys) {
      await this.awardBadgeByKey(userId, key);
    }
  }

  private async checkStreakBadges(userId: string, streak: number): Promise<void> {
    const key = STREAK_BADGES[streak];
    if (key) await this.awardBadgeByKey(userId, key);
  }

  private async awardBadgeByKey(userId: string, key: string): Promise<void> {
    const badge = await this.badgeRepo.findOne({ where: { key } });
    if (!badge) return;

    const existing = await this.userBadgeRepo.findOne({
      where: { userId, badgeId: badge.id },
    });
    if (existing) return; // already awarded

    await this.userBadgeRepo.save(
      this.userBadgeRepo.create({ userId, badgeId: badge.id }),
    );

    if (badge.xpReward > 0) {
      await this.awardXp(userId, `badge_${key}`, badge.xpReward);
    }
  }
}
