import {
  IsString, IsOptional, IsEnum, IsNumber, Min, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EmergencyCategory } from '../entities/emergency-item.entity';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateEmergencyItemDto {
  @ApiProperty({ example: 'Mineralwasser' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ enum: EmergencyCategory, default: EmergencyCategory.OTHER })
  @IsOptional()
  @IsEnum(EmergencyCategory)
  category?: EmergencyCategory;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 'Flaschen' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ example: 9, description: 'Alert threshold — notify when quantity falls below this' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEmergencyItemDto extends PartialType(CreateEmergencyItemDto) {}
