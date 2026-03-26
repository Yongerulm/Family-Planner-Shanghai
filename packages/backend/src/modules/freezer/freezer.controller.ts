import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  ParseUUIDPipe, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FreezerService } from './freezer.service';
import {
  CreateFreezerLocationDto, UpdateFreezerLocationDto,
  CreateFreezerItemDto, UpdateFreezerItemDto,
} from './dto/freezer.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

@ApiTags('Freezer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FamilyMemberGuard)
@Controller('families/:familyId/freezer')
export class FreezerController {
  constructor(private readonly freezerService: FreezerService) {}

  // ─── Locations ─────────────────────────────────────────────────────────────

  @Get('locations')
  @ApiOperation({ summary: 'List freezer locations with items' })
  getLocations(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.freezerService.getLocations(familyId);
  }

  @Get('locations/:locationId')
  @ApiOperation({ summary: 'Get a single freezer location' })
  getLocation(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.freezerService.getLocation(familyId, locationId);
  }

  @Post('locations')
  @ApiOperation({ summary: 'Create a freezer location' })
  createLocation(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateFreezerLocationDto,
  ) {
    return this.freezerService.createLocation(familyId, dto);
  }

  @Patch('locations/:locationId')
  @ApiOperation({ summary: 'Update a freezer location' })
  updateLocation(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: UpdateFreezerLocationDto,
  ) {
    return this.freezerService.updateLocation(familyId, locationId, dto);
  }

  @Delete('locations/:locationId')
  @ApiOperation({ summary: 'Delete a freezer location' })
  deleteLocation(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.freezerService.deleteLocation(familyId, locationId);
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  @Get('locations/:locationId/items')
  @ApiOperation({ summary: 'List items in a freezer location' })
  getItems(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.freezerService.getItems(familyId, locationId);
  }

  @Post('locations/:locationId/items')
  @ApiOperation({ summary: 'Add item to freezer location' })
  addItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: CreateFreezerItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.freezerService.addItem(familyId, locationId, dto, user);
  }

  @Patch('locations/:locationId/items/:itemId')
  @ApiOperation({ summary: 'Update a freezer item' })
  updateItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateFreezerItemDto,
  ) {
    return this.freezerService.updateItem(familyId, locationId, itemId, dto);
  }

  @Delete('locations/:locationId/items/:itemId')
  @ApiOperation({ summary: 'Remove a freezer item' })
  deleteItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.freezerService.deleteItem(familyId, locationId, itemId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get items expiring within N days (default 7)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getExpiringItems(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('days') days?: string,
  ) {
    return this.freezerService.getExpiringItems(familyId, days ? parseInt(days, 10) : 7);
  }
}
