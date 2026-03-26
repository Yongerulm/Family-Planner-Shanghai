import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { Family } from '../families/entities/family.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Family])],
  controllers: [AdminController],
})
export class AdminModule {}
