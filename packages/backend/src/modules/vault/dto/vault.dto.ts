import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({ example: 'Reisepass Max Mustermann' })
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, example: 'Ausweis' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}

export class UpdateDocumentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class DocumentResponseDto {
  id: string;
  familyId: string;
  uploadedBy: string;
  name: string;
  description: string | null;
  category: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
  // NICHT enthalten: storageKey, encryptionIv (sensitiv)
}

export class DownloadUrlResponseDto {
  @ApiProperty({ description: 'Presigned download URL (valid for 60 seconds)' })
  downloadUrl: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ description: 'SHA-256 checksum of decrypted file for verification' })
  checksum: string;
}
