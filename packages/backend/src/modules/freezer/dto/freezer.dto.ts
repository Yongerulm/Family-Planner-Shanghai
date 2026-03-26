import {
  IsString, IsOptional, IsNumber, Min, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateFreezerLocationDto {
  @ApiProperty({ example: 'Tiefkühlschrank Keller' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFreezerLocationDto extends PartialType(CreateFreezerLocationDto) {}

export class CreateFreezerItemDto {
  @ApiProperty({ example: 'Hähnchenbrust' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 'g' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  frozenOn?: string;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  bestBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFreezerItemDto extends PartialType(CreateFreezerItemDto) {}
