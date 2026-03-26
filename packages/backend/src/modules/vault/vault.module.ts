import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { EncryptionService } from './services/encryption.service';
import { VaultDocument } from './entities/vault-document.entity';
import { MinioService } from '../../config/minio.config';

@Module({
  imports: [TypeOrmModule.forFeature([VaultDocument])],
  controllers: [VaultController],
  providers: [VaultService, EncryptionService, MinioService],
  exports: [VaultService, EncryptionService],
})
export class VaultModule {}
