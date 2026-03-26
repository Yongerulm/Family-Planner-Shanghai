import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findByUser(userId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByFamily(familyId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { familyId },
      order: { createdAt: 'DESC' },
    });
  }
}
