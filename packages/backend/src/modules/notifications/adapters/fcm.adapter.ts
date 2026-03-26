import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushAdapter, PushPayload, PushResult } from './push.adapter';

/**
 * FCM Push Adapter (Android)
 *
 * WICHTIG - China-Kontext:
 * FCM ist in China durch die GFW blockiert oder stark gedrosselt.
 * Dieser Adapter ist deshalb als optionaler Fallback implementiert.
 * Das In-App Notification Center funktioniert IMMER, unabhängig von FCM.
 *
 * Konfiguration via .env:
 *   FCM_SERVER_KEY (Legacy FCM v1: Service Account JSON)
 */
@Injectable()
export class FcmPushAdapter extends PushAdapter implements OnModuleInit {
  readonly platform = 'fcm' as const;
  private readonly logger = new Logger(FcmPushAdapter.name);

  private configured = false;
  private serverKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.serverKey = configService.get<string>('app.push.fcm.serverKey', '');
  }

  onModuleInit(): void {
    if (this.serverKey) {
      this.configured = true;
      this.logger.log('FCM adapter configured (note: unreliable in China)');
    } else {
      this.logger.warn('FCM not configured - Android push notifications will use in-app fallback');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(payload: PushPayload): Promise<PushResult> {
    if (!this.configured) {
      return { success: false, error: 'FCM not configured' };
    }

    try {
      const failedTokens: string[] = [];

      for (const token of payload.deviceTokens) {
        try {
          await this.sendToDevice(token, payload);
        } catch (err) {
          this.logger.warn(`FCM send failed: ${(err as Error).message}`);
          failedTokens.push(token);
        }
      }

      if (failedTokens.length === payload.deviceTokens.length) {
        return { success: false, error: 'All FCM sends failed', failedTokens };
      }

      return { success: true, failedTokens };
    } catch (err) {
      this.logger.error(`FCM adapter error: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    }
  }

  private async sendToDevice(deviceToken: string, payload: PushPayload): Promise<void> {
    // FCM v1 API: https://fcm.googleapis.com/v1/projects/{projectId}/messages:send
    // Authentifizierung: OAuth2 Bearer Token aus Service Account

    void deviceToken;
    void payload;

    // Platzhalter - wird in Phase H vollständig implementiert
    this.logger.debug(`[FCM] Would send to token: ${deviceToken.slice(0, 10)}...`);
  }
}
