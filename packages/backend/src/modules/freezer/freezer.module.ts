import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreezerController } from './freezer.controller';
import { FreezerService } from './freezer.service';
import { FreezerLocation } from './entities/freezer-location.entity';
import { FreezerItem } from './entities/freezer-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FreezerLocation, FreezerItem])],
  controllers: [FreezerController],
  providers: [FreezerService],
  exports: [FreezerService],
})
export class FreezerModule {}
