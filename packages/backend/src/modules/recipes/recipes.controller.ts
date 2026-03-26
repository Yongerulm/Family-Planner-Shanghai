import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto, UpdateRecipeDto } from './dto/recipe.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

@ApiTags('Recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FamilyMemberGuard)
@Controller('families/:familyId/recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @ApiOperation({ summary: 'List all recipes for a family' })
  findAll(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.recipesService.findAll(familyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single recipe with ingredients' })
  findOne(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.recipesService.findOne(familyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new recipe' })
  create(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateRecipeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recipesService.create(familyId, dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recipe (creator or admin only)' })
  update(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recipesService.update(familyId, id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a recipe (creator or admin only)' })
  remove(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recipesService.remove(familyId, id, user);
  }
}
