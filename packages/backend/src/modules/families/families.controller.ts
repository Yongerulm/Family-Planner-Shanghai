import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { FamiliesService, CreateFamilyDto, UpdateFamilyDto } from './families.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';
import { Family } from './entities/family.entity';

@ApiTags('families')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all families' })
  @ApiResponse({ status: 200, description: 'Returns all families' })
  async findAll(): Promise<Family[]> {
    return this.familiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a family by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Returns the family' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Family> {
    const family = await this.familiesService.findById(id);

    if (!family) {
      throw new NotFoundException(`Family with id ${id} not found`);
    }

    return family;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new family' })
  @ApiResponse({ status: 201, description: 'Family created successfully' })
  async create(
    @Body() dto: CreateFamilyDto,
    @CurrentUser() _currentUser: JwtPayload,
  ): Promise<Family> {
    return this.familiesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a family' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Family updated successfully' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFamilyDto,
  ): Promise<Family> {
    return this.familiesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a family' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Family deleted successfully' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.familiesService.remove(id);
  }
}
