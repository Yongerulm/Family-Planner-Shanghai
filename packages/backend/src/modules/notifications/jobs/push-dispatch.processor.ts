import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService, PUSH_DISPATCH_QUEUE, PushDispatchJobData } from '../notifications.service';

@Processor(PUSH_DISPATCH_QUEUE)
export class PushDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(PushDispatchProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<PushDispatchJobData>): Promise<void> {
    try {
      await this.notificationsService.dispatchPush(job.data);
    } catch (err) {
      // Push-Fehler werden geloggt, aber nicht als Job-Fehler gewertet
      // (kein Retry für Push - in-app Notification ist bereits gespeichert)
      this.logger.warn(`Push dispatch failed (non-critical): ${(err as Error).message}`);
    }
  }
}
