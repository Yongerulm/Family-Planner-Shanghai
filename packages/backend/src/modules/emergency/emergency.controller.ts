import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmergencyService } from './emergency.service';
import { CreateEmergencyItemDto, UpdateEmergencyItemDto } from './dto/emergency.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

@ApiTags('Emergency Preparedness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FamilyMemberGuard)
@Controller('families/:familyId/emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Get()
  @ApiOperation({ summary: 'List all emergency preparedness items' })
  getItems(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.emergencyService.getItems(familyId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get expired and low-stock alerts' })
  getAlerts(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.emergencyService.getAlerts(familyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single emergency item' })
  getItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emergencyService.getItem(familyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Add an emergency preparedness item' })
  create(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateEmergencyItemDto,
  ) {
    return this.emergencyService.create(familyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an emergency item (e.g. update quantity after restocking)' })
  update(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmergencyItemDto,
  ) {
    return this.emergencyService.update(familyId, id, dto);
  }

  @Post(':id/check')
  @ApiOperation({ summary: 'Mark item as checked (visual inspection)' })
  markChecked(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.emergencyService.markChecked(familyId, id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an emergency item' })
  delete(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.emergencyService.delete(familyId, id);
  }
}
