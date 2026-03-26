import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, IsOptional, MaxLength, MinLength } from 'class-validator';

import { NotificationsService, RegisterDeviceTokenDto } from './notifications.service';
import { MarkReadDto, NotificationQueryDto } from './dto/notifications.dto';
import { DevicePlatform } from './entities/device-token.entity';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

class RegisterDeviceTokenBody implements RegisterDeviceTokenDto {
  @IsUUID()
  deviceId: string;

  @IsEnum(['apns', 'fcm'])
  platform: DevicePlatform;

  /** APNs hex token (64 chars) or FCM registration token (up to 512 chars) */
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  pushToken: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  appVersion?: string;
}

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user (In-App Notification Center)' })
  getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.getNotifications(user.sub, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  @Patch('mark-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark specific notifications as read' })
  markAsRead(@CurrentUser() user: JwtPayload, @Body() dto: MarkReadDto) {
    return this.notificationsService.markAsRead(user.sub, dto.ids);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  /**
   * Register or update the push notification token for a specific device.
   * Called by the mobile app on startup and whenever the token changes.
   * Upserts by (userId, deviceId) — one DB row per physical device.
   */
  @Patch('device-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Register or update device push token',
    description:
      'Call on app start and whenever Expo/APNs issues a new token. ' +
      'deviceId is a stable UUID stored in SecureStore — survives app updates.',
  })
  registerDeviceToken(
    @CurrentUser() user: JwtPayload,
    @Body() body: RegisterDeviceTokenBody,
  ) {
    return this.notificationsService.registerDeviceToken(user.sub, body);
  }

  /**
   * Remove the push token for a specific device.
   * Call this on logout so the user stops receiving push notifications on this device.
   */
  @Delete('device-token/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove device push token (call on logout)' })
  @ApiParam({ name: 'deviceId', description: 'Stable device UUID from SecureStore' })
  removeDeviceToken(
    @CurrentUser() user: JwtPayload,
    @Param('deviceId') deviceId: string,
  ) {
    return this.notificationsService.removeDeviceToken(user.sub, deviceId);
  }
}
