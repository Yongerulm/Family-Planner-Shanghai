import { IsString, IsBoolean, IsOptional, IsUUID, MaxLength, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  familyId?: string;

  @ApiProperty({ example: 'task.reminder' })
  @IsString()
  @MaxLength(50)
  type: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  data?: Record<string, unknown>;
}

export class MarkReadDto {
  @ApiProperty({ type: [String], description: 'Notification IDs to mark as read' })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

export class NotificationQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;
}
