import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';
import { ShoppingList } from './entities/shopping-list.entity';
import { ShoppingItem } from './entities/shopping-item.entity';
import { Family } from '../families/entities/family.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShoppingList, ShoppingItem, Family])],
  controllers: [ShoppingController],
  providers: [ShoppingService],
  exports: [ShoppingService],
})
export class ShoppingModule {}
