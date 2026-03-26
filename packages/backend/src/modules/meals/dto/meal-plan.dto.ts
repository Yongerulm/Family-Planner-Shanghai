import {
  IsString, IsOptional, IsEnum, IsUUID, IsArray, ValidateNested, MaxLength, Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { MealSlot } from '../entities/meal-plan-entry.entity';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMealPlanEntryDto {
  @ApiProperty({ example: '2024-03-18' })
  @IsString()
  @Matches(ISO_DATE_REGEX)
  date: string;

  @ApiProperty({ enum: MealSlot })
  @IsEnum(MealSlot)
  slot: MealSlot;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  recipeId?: string;

  @ApiPropertyOptional({ example: 'Pasta Bolognese' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customMeal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMealPlanEntryDto extends PartialType(
  OmitType(CreateMealPlanEntryDto, ['date', 'slot'] as const),
) {}

export class CreateMealPlanDto {
  @ApiProperty({ example: '2024-03-18', description: 'Monday of the week (ISO date)' })
  @IsString()
  @Matches(ISO_DATE_REGEX)
  weekStart: string;

  @ApiPropertyOptional({ example: 'Woche 12' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ type: [CreateMealPlanEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMealPlanEntryDto)
  entries?: CreateMealPlanEntryDto[];
}
