import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncJob } from './entities/sync-job.entity';
import { JwtPayload } from '../../shared/types/common.types';

export interface SyncRequest {
  deviceId: string;
  lastSyncToken?: string;
  modules?: string[]; // welche Module synced werden sollen
}

export interface SyncResponse {
  syncToken: string;
  syncedAt: string;
  changes: {
    shopping?: unknown;
    tasks?: unknown;
    notes?: unknown;
    calendar?: unknown;
  };
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncJob)
    private readonly syncJobRepo: Repository<SyncJob>,
  ) {}

  async sync(request: SyncRequest, user: JwtPayload): Promise<SyncResponse> {
    const now = new Date();
    const syncToken = now.toISOString();

    // Sync-Job aktualisieren
    await this.syncJobRepo.upsert(
      {
        userId: user.sub,
        deviceId: request.deviceId,
        lastSyncAt: now,
        syncToken,
      },
      ['userId', 'deviceId'],
    );

    // Delta-Sync: nur Änderungen seit letztem Sync zurückgeben
    // Vollständige Implementierung folgt wenn alle Module implementiert sind
    const changes = {};

    this.logger.debug(`Sync completed for user ${user.sub}, device ${request.deviceId}`);

    return {
      syncToken,
      syncedAt: syncToken,
      changes,
    };
  }

  async getSyncStatus(userId: string, deviceId: string): Promise<SyncJob | null> {
    return this.syncJobRepo.findOne({ where: { userId, deviceId } });
  }
}
