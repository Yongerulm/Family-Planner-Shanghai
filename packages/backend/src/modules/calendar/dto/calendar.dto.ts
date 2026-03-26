import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  MaxLength,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReminderConfigDto {
  @ApiProperty({ description: 'Minutes before event start to send reminder', example: 30 })
  @IsInt()
  @Min(0)
  @Max(20160) // Max 14 Tage
  minutesBefore: number;
}

export class CreateCalendarEventDto {
  @ApiProperty({ example: 'Arzttermin' })
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim())
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ required: false, example: 'Praxis Dr. Müller, Musterstraße 1' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiProperty({ example: '2026-04-15T09:00:00.000Z' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-04-15T10:00:00.000Z' })
  @IsDateString()
  endAt: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiProperty({
    required: false,
    example: 'FREQ=WEEKLY;BYDAY=MO',
    description: 'iCal RRULE format for recurring events',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  recurrenceRule?: string;

  @ApiProperty({ required: false, example: '#4F46E5' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{3,8}$/)
  color?: string;

  @ApiProperty({ required: false, type: [ReminderConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderConfigDto)
  reminders?: ReminderConfigDto[];
}

export class UpdateCalendarEventDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim())
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  recurrenceRule?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{3,8}$/)
  color?: string;

  @ApiProperty({ required: false, type: [ReminderConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderConfigDto)
  reminders?: ReminderConfigDto[];
}

export class CalendarQueryDto {
  @ApiProperty({ description: 'Start of date range (ISO 8601)', example: '2026-04-01T00:00:00.000Z' })
  @IsDateString()
  from: string;

  @ApiProperty({ description: 'End of date range (ISO 8601)', example: '2026-04-30T23:59:59.999Z' })
  @IsDateString()
  to: string;
}
