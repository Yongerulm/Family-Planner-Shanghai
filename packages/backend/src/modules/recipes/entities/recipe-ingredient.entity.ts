import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity('recipe_ingredients')
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id', type: 'uuid' })
  recipeId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true })
  quantity: number | null;

  @Column({ length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Recipe, (r) => r.ingredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;
}
