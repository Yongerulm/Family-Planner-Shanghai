import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CalendarService } from './calendar.service';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarQueryDto,
} from './dto/calendar.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

@ApiTags('calendar')
@ApiBearerAuth('access-token')
@Controller('families/:familyId/calendar')
@UseGuards(JwtAuthGuard, RolesGuard, FamilyMemberGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  @ApiOperation({ summary: 'Get events in date range' })
  getEvents(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query() query: CalendarQueryDto,
  ) {
    return this.calendarService.getEvents(familyId, query);
  }

  @Get('events/upcoming')
  @ApiOperation({ summary: 'Get upcoming events (next 7 days)' })
  getUpcoming(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.calendarService.getUpcomingEvents(familyId);
  }

  @Get('events/:eventId')
  @ApiOperation({ summary: 'Get single event' })
  getEvent(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.calendarService.getEvent(eventId, familyId);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create calendar event' })
  createEvent(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateCalendarEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calendarService.createEvent(dto, familyId, user);
  }

  @Put('events/:eventId')
  @ApiOperation({ summary: 'Update calendar event' })
  updateEvent(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: UpdateCalendarEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calendarService.updateEvent(eventId, dto, familyId, user);
  }

  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete calendar event' })
  deleteEvent(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calendarService.deleteEvent(eventId, familyId, user);
  }
}
