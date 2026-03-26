import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { FreezerLocation } from './entities/freezer-location.entity';
import { FreezerItem } from './entities/freezer-item.entity';
import {
  CreateFreezerLocationDto, UpdateFreezerLocationDto,
  CreateFreezerItemDto, UpdateFreezerItemDto,
} from './dto/freezer.dto';
import { JwtPayload } from '../../shared/types/common.types';

@Injectable()
export class FreezerService {
  private readonly logger = new Logger(FreezerService.name);

  constructor(
    @InjectRepository(FreezerLocation)
    private readonly locationRepo: Repository<FreezerLocation>,
    @InjectRepository(FreezerItem)
    private readonly itemRepo: Repository<FreezerItem>,
    private readonly events: EventEmitter2,
  ) {}

  // ─── Locations ─────────────────────────────────────────────────────────────

  async getLocations(familyId: string): Promise<FreezerLocation[]> {
    return this.locationRepo.find({
      where: { familyId },
      relations: ['items'],
      order: { name: 'ASC' },
    });
  }

  async getLocation(familyId: string, locationId: string): Promise<FreezerLocation> {
    const loc = await this.locationRepo.findOne({
      where: { id: locationId, familyId },
      relations: ['items'],
    });
    if (!loc) throw new NotFoundException('Freezer location not found');
    return loc;
  }

  async createLocation(familyId: string, dto: CreateFreezerLocationDto): Promise<FreezerLocation> {
    const loc = this.locationRepo.create({
      familyId,
      name: dto.name,
      description: dto.description ?? null,
    });
    return this.locationRepo.save(loc);
  }

  async updateLocation(
    familyId: string,
    locationId: string,
    dto: UpdateFreezerLocationDto,
  ): Promise<FreezerLocation> {
    const loc = await this.getLocation(familyId, locationId);
    Object.assign(loc, dto);
    return this.locationRepo.save(loc);
  }

  async deleteLocation(familyId: string, locationId: string): Promise<void> {
    const loc = await this.getLocation(familyId, locationId);
    await this.locationRepo.remove(loc);
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  async getItems(familyId: string, locationId: string): Promise<FreezerItem[]> {
    await this.getLocation(familyId, locationId); // verify ownership
    return this.itemRepo.find({
      where: { locationId },
      order: { bestBefore: 'ASC', name: 'ASC' },
    });
  }

  async addItem(
    familyId: string,
    locationId: string,
    dto: CreateFreezerItemDto,
    user: JwtPayload,
  ): Promise<FreezerItem> {
    await this.getLocation(familyId, locationId);
    const item = this.itemRepo.create({
      locationId,
      name: dto.name,
      quantity: dto.quantity ?? null,
      unit: dto.unit ?? null,
      frozenOn: dto.frozenOn ?? null,
      bestBefore: dto.bestBefore ?? null,
      notes: dto.notes ?? null,
      addedBy: user.sub,
    });
    return this.itemRepo.save(item);
  }

  async updateItem(
    familyId: string,
    locationId: string,
    itemId: string,
    dto: UpdateFreezerItemDto,
  ): Promise<FreezerItem> {
    await this.getLocation(familyId, locationId);
    const item = await this.itemRepo.findOne({ where: { id: itemId, locationId } });
    if (!item) throw new NotFoundException('Freezer item not found');
    Object.assign(item, {
      ...dto,
      quantity: 'quantity' in dto ? (dto.quantity ?? null) : item.quantity,
      frozenOn: 'frozenOn' in dto ? (dto.frozenOn ?? null) : item.frozenOn,
      bestBefore: 'bestBefore' in dto ? (dto.bestBefore ?? null) : item.bestBefore,
    });
    return this.itemRepo.save(item);
  }

  async deleteItem(familyId: string, locationId: string, itemId: string): Promise<void> {
    await this.getLocation(familyId, locationId);
    const item = await this.itemRepo.findOne({ where: { id: itemId, locationId } });
    if (!item) throw new NotFoundException('Freezer item not found');
    await this.itemRepo.remove(item);
  }

  async getExpiringItems(familyId: string, withinDays = 7): Promise<FreezerItem[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return this.itemRepo
      .createQueryBuilder('i')
      .innerJoin('freezer_locations', 'l', 'l.id = i.location_id')
      .where('l.family_id = :familyId', { familyId })
      .andWhere('i.best_before IS NOT NULL')
      .andWhere('i.best_before <= :cutoff', { cutoff: cutoffStr })
      .orderBy('i.best_before', 'ASC')
      .getMany();
  }

  // ─── Scheduled expiry check (daily at 08:00) ───────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiredItems(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const expiredItems = await this.itemRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('freezer_locations', 'l', 'l.id = i.location_id')
      .where('i.best_before IS NOT NULL')
      .andWhere('i.best_before <= :today', { today })
      .getMany();

    for (const item of expiredItems) {
      this.events.emit('notification.send', {
        userId: item.addedBy,
        title: 'Freezer item expiring',
        body: `"${item.name}" reached its best-before date`,
        data: { type: 'freezer_expired', itemId: item.id },
      });
    }

    this.logger.debug(`Checked freezer expiry: ${expiredItems.length} expired items found`);
  }
}
