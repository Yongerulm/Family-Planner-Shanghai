import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShoppingList } from './entities/shopping-list.entity';
import { ShoppingItem } from './entities/shopping-item.entity';
import {
  CreateShoppingListDto,
  UpdateShoppingListDto,
  AddShoppingItemDto,
  UpdateShoppingItemDto,
  CheckItemDto,
  BulkCheckItemsDto,
} from './dto/shopping.dto';
import { JwtPayload } from '../../shared/types/common.types';

@Injectable()
export class ShoppingService {
  private readonly logger = new Logger(ShoppingService.name);

  constructor(
    @InjectRepository(ShoppingList)
    private readonly listRepo: Repository<ShoppingList>,
    @InjectRepository(ShoppingItem)
    private readonly itemRepo: Repository<ShoppingItem>,
  ) {}

  async getLists(familyId: string): Promise<ShoppingList[]> {
    return this.listRepo.find({
      where: { familyId, isArchived: false },
      order: { createdAt: 'DESC' },
    });
  }

  async getList(listId: string, familyId: string): Promise<ShoppingList> {
    const list = await this.listRepo.findOne({
      where: { id: listId, familyId },
      relations: ['items'],
      order: { items: { sortOrder: 'ASC', createdAt: 'ASC' } },
    });

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    return list;
  }

  async createList(
    dto: CreateShoppingListDto,
    familyId: string,
    userId: string,
  ): Promise<ShoppingList> {
    const list = this.listRepo.create({
      name: dto.name,
      familyId,
      createdBy: userId,
    });

    return this.listRepo.save(list);
  }

  async updateList(
    listId: string,
    dto: UpdateShoppingListDto,
    familyId: string,
  ): Promise<ShoppingList> {
    const list = await this.listRepo.findOne({ where: { id: listId, familyId } });

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    Object.assign(list, dto);
    return this.listRepo.save(list);
  }

  async deleteList(listId: string, familyId: string, user: JwtPayload): Promise<void> {
    const list = await this.listRepo.findOne({ where: { id: listId, familyId } });

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    // Nur Ersteller oder family_admin kann löschen
    if (list.createdBy !== user.sub && user.role !== 'family_admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Only the creator or family admin can delete this list');
    }

    await this.listRepo.remove(list);
  }

  async addItem(
    listId: string,
    dto: AddShoppingItemDto,
    familyId: string,
    userId: string,
  ): Promise<ShoppingItem> {
    const list = await this.listRepo.findOne({ where: { id: listId, familyId } });

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    // Sort order: Höchste bestehende + 1
    const maxOrder = await this.itemRepo
      .createQueryBuilder('item')
      .select('MAX(item.sort_order)', 'max')
      .where('item.list_id = :listId', { listId })
      .getRawOne<{ max: number | null }>();

    const item = this.itemRepo.create({
      ...dto,
      listId,
      createdBy: userId,
      sortOrder: (maxOrder?.max ?? 0) + 1,
    });

    return this.itemRepo.save(item);
  }

  async updateItem(
    itemId: string,
    dto: UpdateShoppingItemDto,
    familyId: string,
  ): Promise<ShoppingItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['list'],
    });

    if (!item || item.list.familyId !== familyId) {
      throw new NotFoundException('Item not found');
    }

    Object.assign(item, dto);
    return this.itemRepo.save(item);
  }

  async checkItem(
    itemId: string,
    dto: CheckItemDto,
    familyId: string,
    userId: string,
  ): Promise<ShoppingItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['list'],
    });

    if (!item || item.list.familyId !== familyId) {
      throw new NotFoundException('Item not found');
    }

    item.isChecked = dto.isChecked;
    item.checkedBy = dto.isChecked ? userId : null;
    item.checkedAt = dto.isChecked ? new Date() : null;

    return this.itemRepo.save(item);
  }

  async bulkCheck(
    listId: string,
    dto: BulkCheckItemsDto,
    familyId: string,
    userId: string,
  ): Promise<void> {
    const list = await this.listRepo.findOne({ where: { id: listId, familyId } });

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    await this.itemRepo
      .createQueryBuilder()
      .update()
      .set({
        isChecked: dto.isChecked,
        checkedBy: dto.isChecked ? userId : undefined,
        checkedAt: dto.isChecked ? new Date() : undefined,
      })
      .whereInIds(dto.itemIds)
      .andWhere('list_id = :listId', { listId })
      .execute();
  }

  async deleteItem(itemId: string, familyId: string): Promise<void> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['list'],
    });

    if (!item || item.list.familyId !== familyId) {
      throw new NotFoundException('Item not found');
    }

    await this.itemRepo.remove(item);
  }

  async clearCheckedItems(listId: string, familyId: string): Promise<void> {
    const list = await this.listRepo.findOne({ where: { id: listId, familyId } });

    if (!list) {
      throw new NotFoundException('Shopping list not found');
    }

    await this.itemRepo
      .createQueryBuilder()
      .delete()
      .where('list_id = :listId', { listId })
      .andWhere('is_checked = true')
      .execute();
  }
}
