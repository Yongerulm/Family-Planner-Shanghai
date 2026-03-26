import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { SyncJob } from './entities/sync-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SyncJob])],
  controllers: [],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
