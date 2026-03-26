import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MealsService } from './meals.service';
import {
  CreateMealPlanDto, CreateMealPlanEntryDto, UpdateMealPlanEntryDto,
} from './dto/meal-plan.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';

@ApiTags('Meals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FamilyMemberGuard)
@Controller('families/:familyId/meal-plans')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Get()
  @ApiOperation({ summary: 'List all meal plans for a family' })
  findPlans(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.mealsService.findPlans(familyId);
  }

  @Get('week')
  @ApiOperation({ summary: 'Get meal plan for a specific week' })
  @ApiQuery({ name: 'weekStart', description: 'ISO date of Monday (YYYY-MM-DD)' })
  findWeek(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Query('weekStart') weekStart: string,
  ) {
    return this.mealsService.findWeek(familyId, weekStart);
  }

  @Get(':planId')
  @ApiOperation({ summary: 'Get a single meal plan with all entries' })
  findPlan(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.mealsService.findPlan(familyId, planId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new meal plan' })
  createPlan(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateMealPlanDto,
  ) {
    return this.mealsService.createPlan(familyId, dto);
  }

  @Post(':planId/entries')
  @ApiOperation({ summary: 'Add or replace a meal entry (upsert by date+slot)' })
  addEntry(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CreateMealPlanEntryDto,
  ) {
    return this.mealsService.addEntry(familyId, planId, dto);
  }

  @Patch(':planId/entries/:entryId')
  @ApiOperation({ summary: 'Update a meal entry' })
  updateEntry(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: UpdateMealPlanEntryDto,
  ) {
    return this.mealsService.updateEntry(familyId, planId, entryId, dto);
  }

  @Delete(':planId/entries/:entryId')
  @ApiOperation({ summary: 'Remove a meal entry' })
  removeEntry(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.mealsService.removeEntry(familyId, planId, entryId);
  }

  @Delete(':planId')
  @ApiOperation({ summary: 'Delete a meal plan' })
  deletePlan(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.mealsService.deletePlan(familyId, planId);
  }
}
