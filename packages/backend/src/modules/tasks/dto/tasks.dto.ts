import {
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TaskPriority } from '../entities/todo-item.entity';

// ─── Todo Lists ─────────────────────────────────────────────────────────────

export class CreateTodoListDto {
  @ApiProperty({ example: 'Haushaltsaufgaben' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateTodoListDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

// ─── Todo Items ─────────────────────────────────────────────────────────────

export class CreateTodoItemDto {
  @ApiProperty({ example: 'Kühlschrank reinigen' })
  @IsString()
  @MaxLength(300)
  @Transform(({ value }: { value: string }) => value?.trim())
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiProperty({ required: false, example: '2026-04-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false, enum: TaskPriority, default: TaskPriority.NORMAL })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ required: false, description: 'Minutes before due date to send reminder (0 = no reminder)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080) // Max 7 Tage
  reminderMinutesBefore?: number;
}

export class UpdateTodoItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }: { value: string }) => value?.trim())
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assignedTo?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiProperty({ required: false, enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  reminderMinutesBefore?: number;
}

export class CompleteTaskDto {
  @ApiProperty()
  @IsBoolean()
  isCompleted: boolean;
}
