import {
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShoppingListDto {
  @ApiProperty({ example: 'Wocheneinkauf' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;
}

export class UpdateShoppingListDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class AddShoppingItemDto {
  @ApiProperty({ example: 'Milch' })
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({ required: false, example: '2 Liter' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantity?: string;

  @ApiProperty({ required: false, example: 'Milchprodukte' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

export class UpdateShoppingItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  quantity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

export class CheckItemDto {
  @ApiProperty()
  @IsBoolean()
  isChecked: boolean;
}

export class BulkCheckItemsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @ApiProperty()
  @IsBoolean()
  isChecked: boolean;
}

export class ShoppingListResponseDto {
  id: string;
  familyId: string;
  name: string;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
  checkedCount?: number;
}

export class ShoppingItemResponseDto {
  id: string;
  listId: string;
  name: string;
  quantity: string | null;
  category: string | null;
  isChecked: boolean;
  checkedBy: string | null;
  checkedAt: Date | null;
  sortOrder: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
