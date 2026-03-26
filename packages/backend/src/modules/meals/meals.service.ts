import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealPlan } from './entities/meal-plan.entity';
import { MealPlanEntry } from './entities/meal-plan-entry.entity';
import { CreateMealPlanDto, CreateMealPlanEntryDto, UpdateMealPlanEntryDto } from './dto/meal-plan.dto';

@Injectable()
export class MealsService {
  constructor(
    @InjectRepository(MealPlan)
    private readonly planRepo: Repository<MealPlan>,
    @InjectRepository(MealPlanEntry)
    private readonly entryRepo: Repository<MealPlanEntry>,
  ) {}

  async findPlans(familyId: string): Promise<MealPlan[]> {
    return this.planRepo.find({
      where: { familyId },
      order: { weekStart: 'DESC' },
    });
  }

  async findPlan(familyId: string, planId: string): Promise<MealPlan> {
    const plan = await this.planRepo.findOne({
      where: { id: planId, familyId },
      relations: ['entries', 'entries.recipe'],
    });
    if (!plan) throw new NotFoundException('Meal plan not found');
    return plan;
  }

  async findWeek(familyId: string, weekStart: string): Promise<MealPlan | null> {
    return this.planRepo.findOne({
      where: { familyId, weekStart },
      relations: ['entries', 'entries.recipe'],
    });
  }

  async createPlan(familyId: string, dto: CreateMealPlanDto): Promise<MealPlan> {
    const plan = this.planRepo.create({
      familyId,
      weekStart: dto.weekStart,
      name: dto.name ?? null,
    });
    const saved = await this.planRepo.save(plan);

    if (dto.entries?.length) {
      await this.saveEntries(saved.id, dto.entries);
    }

    return this.findPlan(familyId, saved.id);
  }

  async addEntry(familyId: string, planId: string, dto: CreateMealPlanEntryDto): Promise<MealPlanEntry> {
    await this.findPlan(familyId, planId); // ensure plan belongs to family

    // Remove existing entry for same date+slot
    await this.entryRepo.delete({ planId, date: dto.date, slot: dto.slot });

    const entry = this.entryRepo.create({
      planId,
      date: dto.date,
      slot: dto.slot,
      recipeId: dto.recipeId ?? null,
      customMeal: dto.customMeal ?? null,
      notes: dto.notes ?? null,
    });

    return this.entryRepo.save(entry);
  }

  async updateEntry(
    familyId: string,
    planId: string,
    entryId: string,
    dto: UpdateMealPlanEntryDto,
  ): Promise<MealPlanEntry> {
    await this.findPlan(familyId, planId);
    const entry = await this.entryRepo.findOne({ where: { id: entryId, planId } });
    if (!entry) throw new NotFoundException('Meal plan entry not found');

    Object.assign(entry, {
      recipeId: 'recipeId' in dto ? (dto.recipeId ?? null) : entry.recipeId,
      customMeal: 'customMeal' in dto ? (dto.customMeal ?? null) : entry.customMeal,
      notes: 'notes' in dto ? (dto.notes ?? null) : entry.notes,
    });

    return this.entryRepo.save(entry);
  }

  async removeEntry(familyId: string, planId: string, entryId: string): Promise<void> {
    await this.findPlan(familyId, planId);
    const entry = await this.entryRepo.findOne({ where: { id: entryId, planId } });
    if (!entry) throw new NotFoundException('Meal plan entry not found');
    await this.entryRepo.remove(entry);
  }

  async deletePlan(familyId: string, planId: string): Promise<void> {
    const plan = await this.findPlan(familyId, planId);
    await this.planRepo.remove(plan);
  }

  private async saveEntries(planId: string, dtos: CreateMealPlanEntryDto[]): Promise<void> {
    const entries = dtos.map((dto) =>
      this.entryRepo.create({
        planId,
        date: dto.date,
        slot: dto.slot,
        recipeId: dto.recipeId ?? null,
        customMeal: dto.customMeal ?? null,
        notes: dto.notes ?? null,
      }),
    );
    await this.entryRepo.save(entries);
  }
}
