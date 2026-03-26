import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { TasksService } from './tasks.service';
import {
  CreateTodoListDto,
  UpdateTodoListDto,
  CreateTodoItemDto,
  UpdateTodoItemDto,
  CompleteTaskDto,
} from './dto/tasks.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('families/:familyId/tasks')
@UseGuards(JwtAuthGuard, RolesGuard, FamilyMemberGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ─── Lists ─────────────────────────────────────────────────────────────────

  @Get('lists')
  @ApiOperation({ summary: 'Get all accessible todo lists' })
  getLists(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.getLists(familyId, user.sub);
  }

  @Get('lists/:listId')
  @ApiOperation({ summary: 'Get todo list with items' })
  getList(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.getList(listId, familyId, user.sub);
  }

  @Post('lists')
  @ApiOperation({ summary: 'Create todo list' })
  createList(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateTodoListDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.createList(dto, familyId, user.sub);
  }

  @Put('lists/:listId')
  @ApiOperation({ summary: 'Update todo list' })
  updateList(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: UpdateTodoListDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.updateList(listId, dto, familyId, user.sub);
  }

  @Delete('lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete todo list' })
  deleteList(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.deleteList(listId, familyId, user);
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  @Post('lists/:listId/items')
  @ApiOperation({ summary: 'Create task item' })
  createItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: CreateTodoItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.createItem(listId, dto, familyId, user.sub);
  }

  @Put('lists/:listId/items/:itemId')
  @ApiOperation({ summary: 'Update task item' })
  updateItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateTodoItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.updateItem(itemId, dto, familyId, user.sub);
  }

  @Patch('lists/:listId/items/:itemId/complete')
  @ApiOperation({ summary: 'Complete or uncomplete a task' })
  completeItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.completeItem(itemId, dto, familyId, user.sub);
  }

  @Delete('lists/:listId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task item' })
  deleteItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.deleteItem(itemId, familyId, user.sub);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming tasks (next N days)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getUpcoming(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: number,
  ) {
    return this.tasksService.getUpcomingTasks(familyId, user.sub, days ? +days : 7);
  }
}
