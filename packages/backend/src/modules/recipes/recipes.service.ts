import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { CreateRecipeDto, UpdateRecipeDto } from './dto/recipe.dto';
import { JwtPayload } from '../../shared/types/common.types';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly ingredientRepo: Repository<RecipeIngredient>,
  ) {}

  async findAll(familyId: string): Promise<Recipe[]> {
    return this.recipeRepo.find({
      where: { familyId },
      relations: ['ingredients'],
      order: { name: 'ASC' },
    });
  }

  async findOne(familyId: string, id: string): Promise<Recipe> {
    const recipe = await this.recipeRepo.findOne({
      where: { id, familyId },
      relations: ['ingredients', 'creator'],
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    return recipe;
  }

  async create(familyId: string, dto: CreateRecipeDto, user: JwtPayload): Promise<Recipe> {
    const recipe = this.recipeRepo.create({
      familyId,
      name: dto.name,
      description: dto.description ?? null,
      prepTimeMin: dto.prepTimeMin ?? null,
      cookTimeMin: dto.cookTimeMin ?? null,
      servings: dto.servings ?? null,
      imageUrl: dto.imageUrl ?? null,
      tags: dto.tags ?? null,
      createdBy: user.sub,
    });

    const saved = await this.recipeRepo.save(recipe);

    if (dto.ingredients?.length) {
      const ingredients = dto.ingredients.map((ing, idx) =>
        this.ingredientRepo.create({
          recipeId: saved.id,
          name: ing.name,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          sortOrder: ing.sortOrder ?? idx,
        }),
      );
      await this.ingredientRepo.save(ingredients);
    }

    return this.findOne(familyId, saved.id);
  }

  async update(familyId: string, id: string, dto: UpdateRecipeDto, user: JwtPayload): Promise<Recipe> {
    const recipe = await this.findOne(familyId, id);
    this.assertEditor(recipe, user);

    const { ingredients, ...rest } = dto;
    Object.assign(recipe, {
      ...rest,
      description: 'description' in dto ? (dto.description ?? null) : recipe.description,
      prepTimeMin: 'prepTimeMin' in dto ? (dto.prepTimeMin ?? null) : recipe.prepTimeMin,
      cookTimeMin: 'cookTimeMin' in dto ? (dto.cookTimeMin ?? null) : recipe.cookTimeMin,
      servings: 'servings' in dto ? (dto.servings ?? null) : recipe.servings,
      imageUrl: 'imageUrl' in dto ? (dto.imageUrl ?? null) : recipe.imageUrl,
      tags: 'tags' in dto ? (dto.tags ?? null) : recipe.tags,
    });

    await this.recipeRepo.save(recipe);

    if (ingredients !== undefined) {
      await this.ingredientRepo.delete({ recipeId: id });
      if (ingredients.length) {
        const newIngredients = ingredients.map((ing, idx) =>
          this.ingredientRepo.create({
            recipeId: id,
            name: ing.name,
            quantity: ing.quantity ?? null,
            unit: ing.unit ?? null,
            sortOrder: ing.sortOrder ?? idx,
          }),
        );
        await this.ingredientRepo.save(newIngredients);
      }
    }

    return this.findOne(familyId, id);
  }

  async remove(familyId: string, id: string, user: JwtPayload): Promise<void> {
    const recipe = await this.findOne(familyId, id);
    this.assertEditor(recipe, user);
    await this.recipeRepo.remove(recipe);
  }

  private assertEditor(recipe: Recipe, user: JwtPayload): void {
    if (recipe.createdBy !== user.sub && user.role !== 'super_admin' && user.role !== 'family_admin') {
      throw new ForbiddenException('Only the creator or an admin can modify this recipe');
    }
  }
}
