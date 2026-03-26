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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { ShoppingService } from './shopping.service';
import {
  CreateShoppingListDto,
  UpdateShoppingListDto,
  AddShoppingItemDto,
  UpdateShoppingItemDto,
  CheckItemDto,
  BulkCheckItemsDto,
} from './dto/shopping.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtPayload } from '../../shared/types/common.types';

@ApiTags('shopping')
@ApiBearerAuth('access-token')
@Controller('families/:familyId/shopping')
@UseGuards(JwtAuthGuard, RolesGuard, FamilyMemberGuard)
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  // ─── Lists ─────────────────────────────────────────────────────────────────

  @Get('lists')
  @ApiOperation({ summary: 'Get all shopping lists for family' })
  getLists(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ) {
    return this.shoppingService.getLists(familyId);
  }

  @Get('lists/:listId')
  @ApiParam({ name: 'listId', type: 'string' })
  @ApiOperation({ summary: 'Get shopping list with items' })
  getList(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
  ) {
    return this.shoppingService.getList(listId, familyId);
  }

  @Post('lists')
  @ApiOperation({ summary: 'Create shopping list' })
  @ApiResponse({ status: 201 })
  createList(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateShoppingListDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shoppingService.createList(dto, familyId, user.sub);
  }

  @Put('lists/:listId')
  @ApiOperation({ summary: 'Update shopping list' })
  updateList(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: UpdateShoppingListDto,
  ) {
    return this.shoppingService.updateList(listId, dto, familyId);
  }

  @Delete('lists/:listId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('family_admin', 'adult', 'super_admin')
  @ApiOperation({ summary: 'Delete shopping list' })
  deleteList(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shoppingService.deleteList(listId, familyId, user);
  }

  // ─── Items ─────────────────────────────────────────────────────────────────

  @Post('lists/:listId/items')
  @ApiOperation({ summary: 'Add item to shopping list' })
  addItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: AddShoppingItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shoppingService.addItem(listId, dto, familyId, user.sub);
  }

  @Put('lists/:listId/items/:itemId')
  @ApiOperation({ summary: 'Update shopping item' })
  updateItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateShoppingItemDto,
  ) {
    return this.shoppingService.updateItem(itemId, dto, familyId);
  }

  @Patch('lists/:listId/items/:itemId/check')
  @ApiOperation({ summary: 'Check/uncheck shopping item' })
  checkItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CheckItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shoppingService.checkItem(itemId, dto, familyId, user.sub);
  }

  @Patch('lists/:listId/items/bulk-check')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bulk check/uncheck items' })
  bulkCheck(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: BulkCheckItemsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shoppingService.bulkCheck(listId, dto, familyId, user.sub);
  }

  @Delete('lists/:listId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete shopping item' })
  deleteItem(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.shoppingService.deleteItem(itemId, familyId);
  }

  @Delete('lists/:listId/items/checked')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('family_admin', 'adult', 'super_admin')
  @ApiOperation({ summary: 'Clear all checked items from list' })
  clearChecked(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('listId', ParseUUIDPipe) listId: string,
  ) {
    return this.shoppingService.clearCheckedItems(listId, familyId);
  }
}
