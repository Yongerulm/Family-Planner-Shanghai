import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';

import { VaultService } from './vault.service';
import { UploadDocumentDto, UpdateDocumentDto } from './dto/vault.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { FamilyMemberGuard } from '../../shared/guards/family-member.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AuditLog } from '../../shared/decorators/audit-log.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtPayload } from '../../shared/types/common.types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@ApiTags('vault')
@ApiBearerAuth('access-token')
@Controller('families/:familyId/vault')
@UseGuards(JwtAuthGuard, RolesGuard, FamilyMemberGuard)
// Vault ist NUR für family_admin und super_admin
@Roles('family_admin', 'super_admin')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get('documents')
  @ApiOperation({ summary: 'List all vault documents (family_admin only)' })
  getDocuments(@Param('familyId', ParseUUIDPipe) familyId: string) {
    return this.vaultService.getDocuments(familyId);
  }

  @Get('documents/:documentId')
  @ApiOperation({ summary: 'Get document metadata' })
  getDocument(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.vaultService.getDocument(documentId, familyId);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Upload encrypted document to vault' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Im RAM halten, niemals auf Disk
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadDocument(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vaultService.uploadDocument(
      dto,
      file.buffer,
      file.originalname,
      user,
      familyId,
    );
  }

  /**
   * Direkter Download (empfohlen): API entschlüsselt und streamt.
   * Der Encryption Key verlässt niemals den Server.
   */
  @Get('documents/:documentId/download')
  @AuditLog('vault.document.download')
  @ApiOperation({ summary: 'Download and decrypt document (streams decrypted content)' })
  async downloadDocument(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, mimeType, filename } = await this.vaultService.downloadDocument(
      documentId,
      familyId,
      user,
    );

    // Sicherheits-Headers für Download
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.end(buffer);
  }

  @Put('documents/:documentId')
  @ApiOperation({ summary: 'Update document metadata' })
  updateDocument(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vaultService.updateDocument(documentId, dto, familyId, user);
  }

  @Delete('documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete vault document' })
  deleteDocument(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vaultService.deleteDocument(documentId, familyId, user);
  }
}
