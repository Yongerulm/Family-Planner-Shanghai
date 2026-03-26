import {
  Controller, Get, Param, ParseUUIDPipe, Delete, Patch, Body, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';
import { Family } from '../families/entities/family.entity';

class AdminUserPatchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Family) private readonly familyRepo: Repository<Family>,
  ) {}

  // ─── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'System-wide statistics (super_admin only)' })
  async getStats() {
    const [totalUsers, totalFamilies] = await Promise.all([
      this.userRepo.count(),
      this.familyRepo.count(),
    ]);
    return {
      totalUsers,
      totalFamilies,
      serverTime: new Date().toISOString(),
    };
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listUsers(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where = search ? { email: ILike(`%${search}%`) } : {};
    const [users, total] = await this.userRepo.findAndCount({
      where,
      select: ['id', 'email', 'displayName', 'isActive', 'cachedRole', 'createdAt'],
      order: { createdAt: 'DESC' },
      skip,
      take: limitNum,
    });

    return { data: users, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.userRepo.findOne({
      where: { id },
      select: ['id', 'email', 'displayName', 'isActive', 'cachedRole', 'createdAt'],
      relations: ['familyRoles'],
    });
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (displayName, isActive)' })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUserPatchDto,
  ) {
    await this.userRepo.update(id, dto);
    return this.userRepo.findOne({ where: { id }, select: ['id', 'email', 'displayName', 'isActive'] });
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Soft-delete a user' })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    await this.userRepo.softDelete(id);
    return { success: true };
  }

  // ─── Families ──────────────────────────────────────────────────────────────

  @Get('families')
  @ApiOperation({ summary: 'List all families' })
  async listFamilies(@Query('page') page = '1', @Query('limit') limit = '20') {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const [families, total] = await this.familyRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    return { data: families, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  }

  @Get('families/:id')
  @ApiOperation({ summary: 'Get family details with members' })
  async getFamily(@Param('id', ParseUUIDPipe) id: string) {
    return this.familyRepo.findOne({ where: { id }, relations: ['members'] });
  }

  @Delete('families/:id')
  @ApiOperation({ summary: 'Delete a family (cascades all data!)' })
  async deleteFamily(@Param('id', ParseUUIDPipe) id: string) {
    await this.familyRepo.delete(id);
    return { success: true };
  }
}
