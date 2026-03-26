import {
  IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsUUID,
  IsNumber, Min, Max, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Weekday } from '../entities/timetable-slot.entity';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

// ─── Timetable ────────────────────────────────────────────────────────────────

export class CreateTimetableSlotDto {
  @ApiProperty()
  @IsUUID()
  childId: string;

  @ApiProperty({ enum: Weekday })
  @IsEnum(Weekday)
  weekday: Weekday;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(12)
  periodNumber: number;

  @ApiProperty({ example: 'Mathematik' })
  @IsString()
  @MaxLength(100)
  subject: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  teacher?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX)
  startsAt?: string;

  @ApiPropertyOptional({ example: '08:45' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX)
  endsAt?: string;
}

export class UpdateTimetableSlotDto extends PartialType(CreateTimetableSlotDto) {}

// ─── Homework ─────────────────────────────────────────────────────────────────

export class CreateHomeworkDto {
  @ApiProperty()
  @IsUUID()
  childId: string;

  @ApiProperty({ example: 'Mathematik' })
  @IsString()
  @MaxLength(100)
  subject: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ example: '2024-03-20' })
  @IsString()
  @Matches(ISO_DATE)
  dueDate: string;
}

export class UpdateHomeworkDto extends PartialType(CreateHomeworkDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}

// ─── Exam ─────────────────────────────────────────────────────────────────────

export class CreateExamDto {
  @ApiProperty()
  @IsUUID()
  childId: string;

  @ApiProperty({ example: 'Physik' })
  @IsString()
  @MaxLength(100)
  subject: string;

  @ApiProperty({ example: '2024-04-15' })
  @IsString()
  @Matches(ISO_DATE)
  date: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX)
  time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topics?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateExamDto extends PartialType(CreateExamDto) {
  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  grade?: number;
}

// ─── Grade ────────────────────────────────────────────────────────────────────

export class CreateGradeDto {
  @ApiProperty()
  @IsUUID()
  childId: string;

  @ApiProperty({ example: 'Deutsch' })
  @IsString()
  @MaxLength(100)
  subject: string;

  @ApiProperty({ example: 2.0 })
  @IsNumber()
  @Min(1)
  @Max(6)
  value: number;

  @ApiPropertyOptional({ example: 'Aufsatz' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @ApiPropertyOptional({ example: '2024-03-10' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE)
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: '2023/24' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  schoolYear?: string;
}

export class UpdateGradeDto extends PartialType(CreateGradeDto) {}
