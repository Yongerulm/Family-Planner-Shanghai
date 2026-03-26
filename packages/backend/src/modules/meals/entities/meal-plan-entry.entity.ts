import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { MealPlan } from './meal-plan.entity';
import { Recipe } from '../../recipes/entities/recipe.entity';

export enum MealSlot {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

@Entity('meal_plan_entries')
export class MealPlanEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @Column({ name: 'recipe_id', type: 'uuid', nullable: true })
  recipeId: string | null;

  @Column({ type: 'date' })
  date: string; // ISO date string

  @Column({ type: 'enum', enum: MealSlot })
  slot: MealSlot;

  @Column({ length: 200, nullable: true })
  customMeal: string | null; // if no recipe linked

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => MealPlan, (p) => p.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: MealPlan;

  @ManyToOne(() => Recipe, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe | null;
}
