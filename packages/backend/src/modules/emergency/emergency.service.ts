import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmergencyItem } from './entities/emergency-item.entity';
import { CreateEmergencyItemDto, UpdateEmergencyItemDto } from './dto/emergency.dto';
import { JwtPayload } from '../../shared/types/common.types';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    @InjectRepository(EmergencyItem)
    private readonly itemRepo: Repository<EmergencyItem>,
    private readonly events: EventEmitter2,
  ) {}

  async getItems(familyId: string): Promise<EmergencyItem[]> {
    return this.itemRepo.find({
      where: { familyId },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getItem(familyId: string, id: string): Promise<EmergencyItem> {
    const item = await this.itemRepo.findOne({ where: { id, familyId } });
    if (!item) throw new NotFoundException('Emergency item not found');
    return item;
  }

  async create(familyId: string, dto: CreateEmergencyItemDto): Promise<EmergencyItem> {
    const item = this.itemRepo.create({
      familyId,
      name: dto.name,
      category: dto.category ?? 'other',
      quantity: dto.quantity ?? null,
      unit: dto.unit ?? null,
      minQuantity: dto.minQuantity ?? null,
      expiryDate: dto.expiryDate ?? null,
      notes: dto.notes ?? null,
    });
    return this.itemRepo.save(item);
  }

  async update(familyId: string, id: string, dto: UpdateEmergencyItemDto): Promise<EmergencyItem> {
    const item = await this.getItem(familyId, id);
    Object.assign(item, {
      ...dto,
      quantity: 'quantity' in dto ? (dto.quantity ?? null) : item.quantity,
      minQuantity: 'minQuantity' in dto ? (dto.minQuantity ?? null) : item.minQuantity,
      expiryDate: 'expiryDate' in dto ? (dto.expiryDate ?? null) : item.expiryDate,
    });
    return this.itemRepo.save(item);
  }

  async markChecked(familyId: string, id: string, user: JwtPayload): Promise<EmergencyItem> {
    const item = await this.getItem(familyId, id);
    item.lastCheckedAt = new Date();
    item.lastCheckedBy = user.sub;
    return this.itemRepo.save(item);
  }

  async delete(familyId: string, id: string): Promise<void> {
    const item = await this.getItem(familyId, id);
    await this.itemRepo.remove(item);
  }

  async getAlerts(familyId: string): Promise<{ expired: EmergencyItem[]; lowStock: EmergencyItem[] }> {
    const today = new Date().toISOString().slice(0, 10);
    const items = await this.getItems(familyId);

    const expired = items.filter((i) => i.expiryDate && i.expiryDate <= today);
    const lowStock = items.filter(
      (i) =>
        i.minQuantity !== null &&
        i.quantity !== null &&
        Number(i.quantity) < Number(i.minQuantity),
    );

    return { expired, lowStock };
  }

  @Cron(CronExpression.EVERY_WEEK)
  async sendExpiryAlerts(): Promise<void> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const cutoff = thirtyDaysFromNow.toISOString().slice(0, 10);

    const expiringItems = await this.itemRepo
      .createQueryBuilder('e')
      .where('e.expiry_date IS NOT NULL')
      .andWhere('e.expiry_date <= :cutoff', { cutoff })
      .getMany();

    this.logger.debug(`Emergency expiry check: ${expiringItems.length} items expiring within 30 days`);

    for (const item of expiringItems) {
      this.events.emit('audit.log', {
        familyId: item.familyId,
        action: 'emergency.item.expiry_warning',
        resource: 'emergency_item',
        resourceId: item.id,
        metadata: { expiryDate: item.expiryDate, itemName: item.name },
      });
    }
  }
}
