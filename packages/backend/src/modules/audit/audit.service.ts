import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLog } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  userId?: string | null;
  familyId?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: dto.userId ?? null,
      familyId: dto.familyId ?? null,
      action: dto.action,
      resource: dto.resource ?? null,
      resourceId: dto.resourceId ?? null,
      ipAddress: dto.ipAddress ?? null,
      userAgent: dto.userAgent ?? null,
      metadata: dto.metadata ?? null,
    });

    return this.auditLogRepository.save(auditLog);
  }

  /**
   * Empfängt 'audit.log' Events von anderen Modulen via EventEmitter.
   * Verhindert direkte Modul-Abhängigkeiten von AuditModule.
   */
  @OnEvent('audit.log')
  async handleAuditEvent(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.log(dto);
    } catch (err) {
      // Audit-Fehler dürfen die Hauptoperation NICHT unterbrechen
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`, { action: dto.action });
    }
  }

  async findByUser(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByFamily(familyId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { familyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByAction(action: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { action },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
