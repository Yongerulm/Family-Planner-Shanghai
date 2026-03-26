import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM Encryption Service
 *
 * Sicherheitsdesign:
 * - AES-256-GCM: Authentifizierte Verschlüsselung (kein Ciphertext-Tampering möglich)
 * - IV: 12 Bytes zufällig pro Datei (niemals wiederverwenden!)
 * - AAD (Additional Authenticated Data): documentId + userId
 *   → Verhindert Ciphertext-Swapping zwischen Dokumenten
 * - Key: 32-Byte Hex-String aus VAULT_ENCRYPTION_KEY env var
 * - Auth-Tag: 16 Bytes (128 Bit, GCM Standard)
 *
 * KRITISCH: Der Encryption Key darf NIEMALS:
 * - Im Repository gespeichert werden
 * - An Clients übertragen werden
 * - In Logs erscheinen
 * - In der Datenbank stehen
 *
 * Bei Key-Verlust: Alle Vault-Dateien sind permanent verloren!
 * → Key-Backup in Passwort-Manager ist PFLICHT
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_BYTES = 12;  // 96 Bit - optimal für GCM
  private readonly TAG_BYTES = 16; // 128 Bit Auth-Tag

  private encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const keyHex = this.configService.get<string>('app.vault.encryptionKey', '');

    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'VAULT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          'Generate with: openssl rand -hex 32',
      );
    }

    this.encryptionKey = Buffer.from(keyHex, 'hex');
    this.logger.log('Vault encryption service initialized (AES-256-GCM)');
  }

  /**
   * Verschlüsselt einen Buffer mit AES-256-GCM.
   *
   * Output-Format: [IV (12 bytes)] + [AuthTag (16 bytes)] + [Ciphertext]
   * Der IV wird prepended, damit er beim Entschlüsseln verfügbar ist.
   * IV ist auch in der DB gespeichert (redundant, für Sicherheit).
   *
   * @param plaintext - Rohe Datei als Buffer
   * @param aad - Additional Authenticated Data (documentId + userId als Buffer)
   * @returns { encrypted: Buffer, iv: string (hex) }
   */
  encrypt(
    plaintext: Buffer,
    aad: Buffer,
  ): { encrypted: Buffer; iv: string } {
    const iv = randomBytes(this.IV_BYTES);
    const cipher = createCipheriv(this.ALGORITHM, this.encryptionKey, iv, {
      authTagLength: this.TAG_BYTES,
    });

    cipher.setAAD(aad);

    const ciphertextChunks: Buffer[] = [];
    ciphertextChunks.push(cipher.update(plaintext));
    ciphertextChunks.push(cipher.final());

    const authTag = cipher.getAuthTag();
    const ciphertext = Buffer.concat(ciphertextChunks);

    // Format: IV + AuthTag + Ciphertext
    const encrypted = Buffer.concat([iv, authTag, ciphertext]);

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Entschlüsselt einen Buffer.
   *
   * Erwartet das Format: [IV (12 bytes)] + [AuthTag (16 bytes)] + [Ciphertext]
   *
   * @param encrypted - Verschlüsselter Buffer (inkl. IV und AuthTag)
   * @param aad - Muss identisch mit dem AAD bei Verschlüsselung sein
   * @throws wenn AuthTag-Verifikation fehlschlägt (Tampering-Erkennung)
   */
  decrypt(encrypted: Buffer, aad: Buffer): Buffer {
    const iv = encrypted.subarray(0, this.IV_BYTES);
    const authTag = encrypted.subarray(this.IV_BYTES, this.IV_BYTES + this.TAG_BYTES);
    const ciphertext = encrypted.subarray(this.IV_BYTES + this.TAG_BYTES);

    const decipher = createDecipheriv(this.ALGORITHM, this.encryptionKey, iv, {
      authTagLength: this.TAG_BYTES,
    });

    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    const chunks: Buffer[] = [];
    chunks.push(decipher.update(ciphertext));
    chunks.push(decipher.final()); // Wirft bei fehlgeschlagener Auth-Tag-Verifikation

    return Buffer.concat(chunks);
  }

  /**
   * Erstellt SHA-256 Checksum eines Buffers.
   * Wird vor der Verschlüsselung berechnet (Checksum der Originaldatei).
   */
  computeChecksum(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Erstellt AAD (Additional Authenticated Data) für ein Dokument.
   * Verhindert, dass verschlüsselte Dateien zwischen verschiedenen Dokumenten getauscht werden.
   */
  buildAad(documentId: string, userId: string): Buffer {
    return Buffer.from(`${documentId}:${userId}`, 'utf8');
  }
}
