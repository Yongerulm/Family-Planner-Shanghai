import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { fromBuffer } from 'file-type';

import { VaultDocument } from './entities/vault-document.entity';
import { UploadDocumentDto, UpdateDocumentDto, DocumentResponseDto, DownloadUrlResponseDto } from './dto/vault.dto';
import { EncryptionService } from './services/encryption.service';
import { MinioService } from '../../config/minio.config';
import { JwtPayload } from '../../shared/types/common.types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Erlaubte MIME-Types für Vault
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(
    @InjectRepository(VaultDocument)
    private readonly documentRepo: Repository<VaultDocument>,
    private readonly encryptionService: EncryptionService,
    private readonly minioService: MinioService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getDocuments(familyId: string): Promise<DocumentResponseDto[]> {
    const docs = await this.documentRepo.find({
      where: { familyId },
      order: { createdAt: 'DESC' },
    });

    return docs.map((doc) => this.toResponseDto(doc));
  }

  async getDocument(documentId: string, familyId: string): Promise<DocumentResponseDto> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId, familyId } });
    if (!doc) throw new NotFoundException('Document not found');
    return this.toResponseDto(doc);
  }

  /**
   * Upload-Flow:
   * 1. Dateigröße und MIME-Type validieren
   * 2. SHA-256 Checksum der Originaldatei berechnen
   * 3. Mit AES-256-GCM verschlüsseln
   * 4. Verschlüsselte Datei zu MinIO hochladen
   * 5. Metadata in DB speichern
   * 6. Audit-Event emittieren
   */
  async uploadDocument(
    dto: UploadDocumentDto,
    fileBuffer: Buffer,
    originalFilename: string,
    user: JwtPayload,
    familyId: string,
  ): Promise<DocumentResponseDto> {
    // Größen-Validierung
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (fileBuffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    // MIME-Type Validierung via Magic Bytes (nicht nur Content-Type Header)
    const detectedType = await fromBuffer(fileBuffer);
    const mimeType = detectedType?.mime ?? 'application/octet-stream';

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `File type not allowed: ${mimeType}. Allowed: PDF, images, Office documents`,
      );
    }

    // Checksum der Originaldatei
    const checksum = this.encryptionService.computeChecksum(fileBuffer);

    // Dokument-ID vorab generieren (für AAD)
    const documentId = uuidv4();

    // Verschlüsseln mit AAD = documentId:userId
    const aad = this.encryptionService.buildAad(documentId, user.sub);
    const { encrypted, iv } = this.encryptionService.encrypt(fileBuffer, aad);

    // Sicherer Dateiname (Original-Name wird NUR in DB gespeichert, nicht im Pfad)
    const safeExtension = originalFilename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'bin';
    const storageKey = `${familyId}/${documentId}/${uuidv4()}.enc.${safeExtension}`;

    // Upload zu MinIO (Vault-Bucket = privat)
    await this.minioService.putObject(
      this.minioService.getBucketVault(),
      storageKey,
      encrypted,
      encrypted.length,
      {
        'x-document-id': documentId,
        'x-uploaded-by': user.sub,
        'Content-Type': 'application/octet-stream', // Nie den echten MIME-Type exponieren
      },
    );

    // Metadata in DB
    const document = this.documentRepo.create({
      id: documentId,
      familyId,
      uploadedBy: user.sub,
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category ?? null,
      storageKey,
      storageBucket: this.minioService.getBucketVault(),
      fileSizeBytes: fileBuffer.length,
      mimeType,
      isEncrypted: true,
      encryptionIv: iv,
      checksumSha256: checksum,
      tags: dto.tags ?? null,
    });

    const saved = await this.documentRepo.save(document);

    // Audit-Event
    this.eventEmitter.emit('audit.log', {
      userId: user.sub,
      familyId,
      action: 'vault.document.upload',
      resource: 'VaultDocument',
      resourceId: saved.id,
      metadata: { fileName: dto.name, fileSize: fileBuffer.length, mimeType },
    });

    this.logger.log(`Vault document uploaded: ${saved.id} by user ${user.sub}`);
    return this.toResponseDto(saved);
  }

  /**
   * Download-Flow:
   * 1. Audit-Log BEVOR der Download ermöglicht wird
   * 2. Datei von MinIO laden
   * 3. Entschlüsseln
   * 4. Als Buffer zurückgeben (Streaming direkt an Client)
   *
   * HINWEIS: Wir streamen direkt entschlüsselt.
   * Der Encryption Key bleibt nie auf dem Client.
   */
  async downloadDocument(
    documentId: string,
    familyId: string,
    user: JwtPayload,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId, familyId } });
    if (!doc) throw new NotFoundException('Document not found');

    // Audit SOFORT, bevor der Inhalt übertragen wird
    this.eventEmitter.emit('audit.log', {
      userId: user.sub,
      familyId,
      action: 'vault.document.download',
      resource: 'VaultDocument',
      resourceId: doc.id,
      metadata: { fileName: doc.name },
    });

    // Datei von MinIO laden
    const encrypted = await this.minioService.getObject(
      doc.storageBucket,
      doc.storageKey,
    );

    // Entschlüsseln
    const aad = this.encryptionService.buildAad(doc.id, doc.uploadedBy);
    const decrypted = this.encryptionService.decrypt(encrypted, aad);

    // Checksum-Verifikation
    if (doc.checksumSha256) {
      const checksum = this.encryptionService.computeChecksum(decrypted);
      if (checksum !== doc.checksumSha256) {
        this.logger.error(`Checksum mismatch for document ${doc.id}! Possible tampering!`);
        // Audit-Event für kritischen Fehler
        this.eventEmitter.emit('audit.log', {
          userId: user.sub,
          familyId,
          action: 'vault.document.checksum_mismatch',
          resource: 'VaultDocument',
          resourceId: doc.id,
          metadata: { CRITICAL: true },
        });
        throw new BadRequestException('Document integrity check failed');
      }
    }

    return {
      buffer: decrypted,
      mimeType: doc.mimeType ?? 'application/octet-stream',
      filename: doc.name,
    };
  }

  /**
   * Presigned-URL Variante (Alternative zu direktem Streaming).
   * Gibt eine zeitlich begrenzte URL zurück (60 Sekunden).
   * ACHTUNG: Diese URL zeigt auf die VERSCHLÜSSELTE Datei.
   * Für den Client nur sinnvoll wenn er entschlüsseln kann → NICHT empfohlen.
   * Besser: downloadDocument() verwenden (server-seitig entschlüsselt).
   *
   * Diese Methode ist als Referenz vorhanden, aber der direkte Download-Endpunkt
   * ist die empfohlene Methode.
   */
  async getPresignedDownloadUrl(
    documentId: string,
    familyId: string,
    user: JwtPayload,
  ): Promise<DownloadUrlResponseDto> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId, familyId } });
    if (!doc) throw new NotFoundException('Document not found');

    this.eventEmitter.emit('audit.log', {
      userId: user.sub,
      familyId,
      action: 'vault.document.presigned_url_generated',
      resource: 'VaultDocument',
      resourceId: doc.id,
      metadata: { fileName: doc.name },
    });

    const url = await this.minioService.presignedGetUrl(
      doc.storageBucket,
      doc.storageKey,
      60, // 60 Sekunden Gültigkeit
    );

    return {
      downloadUrl: url,
      expiresAt: new Date(Date.now() + 60_000),
      checksum: doc.checksumSha256 ?? '',
    };
  }

  async updateDocument(
    documentId: string,
    dto: UpdateDocumentDto,
    familyId: string,
    user: JwtPayload,
  ): Promise<DocumentResponseDto> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId, familyId } });
    if (!doc) throw new NotFoundException('Document not found');

    if (doc.uploadedBy !== user.sub && user.role !== 'super_admin') {
      throw new ForbiddenException('Only uploader or super admin can update metadata');
    }

    Object.assign(doc, dto);
    const saved = await this.documentRepo.save(doc);

    this.eventEmitter.emit('audit.log', {
      userId: user.sub,
      familyId,
      action: 'vault.document.update',
      resource: 'VaultDocument',
      resourceId: doc.id,
    });

    return this.toResponseDto(saved);
  }

  async deleteDocument(
    documentId: string,
    familyId: string,
    user: JwtPayload,
  ): Promise<void> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId, familyId } });
    if (!doc) throw new NotFoundException('Document not found');

    if (doc.uploadedBy !== user.sub && user.role !== 'family_admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Only uploader or family admin can delete');
    }

    // Soft Delete (MinIO-Datei bleibt bis Hard-Delete)
    await this.documentRepo.softRemove(doc);

    this.eventEmitter.emit('audit.log', {
      userId: user.sub,
      familyId,
      action: 'vault.document.delete',
      resource: 'VaultDocument',
      resourceId: doc.id,
      metadata: { fileName: doc.name },
    });

    this.logger.log(`Vault document soft-deleted: ${doc.id} by user ${user.sub}`);
  }

  private toResponseDto(doc: VaultDocument): DocumentResponseDto {
    return {
      id: doc.id,
      familyId: doc.familyId,
      uploadedBy: doc.uploadedBy,
      name: doc.name,
      description: doc.description,
      category: doc.category,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      tags: doc.tags,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      // storageKey und encryptionIv werden NICHT exponiert
    };
  }
}
