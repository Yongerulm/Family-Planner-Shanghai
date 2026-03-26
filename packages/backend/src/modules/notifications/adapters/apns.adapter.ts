import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http2 from 'http2';
import * as crypto from 'crypto';
import { PushAdapter, PushPayload, PushResult } from './push.adapter';

/**
 * APNs Push Adapter (iOS) — HTTP/2 + JWT Provider Token Authentication
 *
 * Uses Node.js built-in http2 module. No external package required.
 * JWT signed with ES256 using the .p8 private key from Apple Developer Console.
 * HTTP/2 session is reused across requests (APNs requires persistent connections).
 *
 * Konfiguration via .env:
 *   APNS_KEY_ID      — 10-char Key ID (from "Keys" in Apple Developer Console)
 *   APNS_TEAM_ID     — 10-char Team ID (from Apple Developer Account → Membership)
 *   APNS_PRIVATE_KEY — .p8 file contents; store newlines as literal \n in .env
 *   APNS_BUNDLE_ID   — e.g. com.yourname.familyplanner
 *   APNS_PRODUCTION  — "true" for production, "false" for sandbox (default: true)
 */
@Injectable()
export class ApnsPushAdapter extends PushAdapter implements OnModuleInit, OnModuleDestroy {
  readonly platform = 'apns' as const;
  private readonly logger = new Logger(ApnsPushAdapter.name);

  private configured = false;
  private readonly keyId: string;
  private readonly teamId: string;
  private readonly privateKey: string;
  private readonly bundleId: string;
  private readonly production: boolean;
  private readonly apnsAuthority: string;
  private readonly apnsConnectUrl: string;

  // JWT cache — APNs tokens are valid 60 min, we refresh at 50 min
  private cachedJwt: string | null = null;
  private jwtExpiresAt = 0;

  // Persistent HTTP/2 session
  private session: http2.ClientHttp2Session | null = null;

  constructor(private readonly configService: ConfigService) {
    super();
    this.keyId = configService.get<string>('APNS_KEY_ID', '');
    this.teamId = configService.get<string>('APNS_TEAM_ID', '');
    // .p8 files store newlines literally; .env may encode them as \n
    const rawKey = configService.get<string>('APNS_PRIVATE_KEY', '') ?? '';
    this.privateKey = rawKey.replace(/\\n/g, '\n');
    this.bundleId = configService.get<string>('APNS_BUNDLE_ID', 'com.family.planner');
    this.production = configService.get<string>('APNS_PRODUCTION', 'true') === 'true';
    this.apnsAuthority = this.production ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
    this.apnsConnectUrl = `https://${this.apnsAuthority}`;
  }

  onModuleInit(): void {
    if (this.keyId && this.teamId && this.privateKey) {
      this.configured = true;
      this.logger.log(`APNs adapter ready (${this.production ? 'production' : 'sandbox'}, bundle: ${this.bundleId})`);
    } else {
      this.logger.warn('APNs not configured — missing APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY. iOS push disabled.');
    }
  }

  onModuleDestroy(): void {
    if (this.session && !this.session.destroyed) {
      this.session.close();
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(payload: PushPayload): Promise<PushResult> {
    if (!this.configured) {
      return { success: false, error: 'APNs not configured' };
    }

    const failedTokens: string[] = [];

    for (const deviceToken of payload.deviceTokens) {
      try {
        await this.sendToDevice(deviceToken, payload);
      } catch (err) {
        this.logger.warn(`APNs send failed for token ${deviceToken.slice(0, 10)}...: ${(err as Error).message}`);
        failedTokens.push(deviceToken);
      }
    }

    if (failedTokens.length === payload.deviceTokens.length) {
      return { success: false, error: 'All APNs sends failed', failedTokens };
    }
    return {
      success: true,
      failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
    };
  }

  private async sendToDevice(deviceToken: string, payload: PushPayload): Promise<void> {
    const jwt = this.getOrRefreshJwt();
    const session = this.getOrCreateSession();

    const apnsPayload = JSON.stringify({
      aps: {
        alert: {
          title: payload.title,
          body: payload.body ?? '',
        },
        sound: 'default',
        badge: payload.badge ?? 1,
        'content-available': 1,
      },
      data: payload.data ?? {},
    });

    const payloadBuffer = Buffer.from(apnsPayload, 'utf8');

    await new Promise<void>((resolve, reject) => {
      const req = session.request({
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        ':scheme': 'https',
        ':authority': this.apnsAuthority,
        'authorization': `bearer ${jwt}`,
        'apns-push-type': 'alert',
        'apns-topic': this.bundleId,
        'apns-priority': '10',
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400),
        'content-type': 'application/json',
        'content-length': String(payloadBuffer.length),
      });

      let statusCode = 0;
      let responseBody = '';

      req.on('response', (headers) => {
        statusCode = headers[':status'] as number;
      });

      req.setEncoding('utf8');
      req.on('data', (chunk: string) => { responseBody += chunk; });

      req.on('end', () => {
        if (statusCode === 200) {
          resolve();
          return;
        }

        let reason = 'UnknownError';
        try {
          const parsed = JSON.parse(responseBody) as { reason?: string };
          reason = parsed.reason ?? reason;
        } catch {
          // non-JSON response body
        }

        // Log stale tokens so they can be cleaned up
        if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
          this.logger.warn(`APNs stale token (${reason}): ${deviceToken.slice(0, 10)}... — should be removed`);
        }

        reject(new Error(`APNs error ${statusCode}: ${reason}`));
      });

      req.on('error', (err: Error) => {
        this.session = null; // force session recreation on next send
        reject(err);
      });

      req.write(payloadBuffer);
      req.end();
    });
  }

  /**
   * Returns a cached APNs JWT or creates a fresh one.
   *
   * JWT structure: base64url(header).base64url(claims).ES256_signature
   * The private key from .p8 is an EC key in PKCS#8 PEM format.
   * Node's crypto.createSign('SHA256') with an EC key produces ECDSA/SHA-256 = ES256.
   * APNs requires IEEE P1363 format (r||s, 64 bytes) not DER — use dsaEncoding option.
   */
  private getOrRefreshJwt(): string {
    const now = Math.floor(Date.now() / 1000);

    if (this.cachedJwt && now < this.jwtExpiresAt) {
      return this.cachedJwt;
    }

    const headerB64 = this.base64url(JSON.stringify({ alg: 'ES256', kid: this.keyId }));
    const claimsB64 = this.base64url(JSON.stringify({ iss: this.teamId, iat: now }));
    const signingInput = `${headerB64}.${claimsB64}`;

    const sign = crypto.createSign('SHA256');
    sign.update(signingInput);
    // dsaEncoding: 'ieee-p1363' produces the raw r||s signature APNs expects
    const rawSig = sign.sign({ key: this.privateKey, dsaEncoding: 'ieee-p1363' });
    const sigB64url = rawSig.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    this.cachedJwt = `${signingInput}.${sigB64url}`;
    this.jwtExpiresAt = now + 50 * 60; // 50 minutes — Apple revokes after 60

    return this.cachedJwt;
  }

  private getOrCreateSession(): http2.ClientHttp2Session {
    if (!this.session || this.session.destroyed || this.session.closed) {
      this.session = http2.connect(this.apnsConnectUrl);
      this.session.on('error', (err: Error) => {
        this.logger.error(`APNs HTTP/2 session error: ${err.message}`);
        this.session = null;
      });
      this.session.on('close', () => {
        this.session = null;
      });
    }
    return this.session;
  }

  private base64url(input: string): string {
    return Buffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
