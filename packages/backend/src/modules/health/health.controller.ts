import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SetMetadata } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';

const Public = () => SetMetadata('isPublic', true);

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness probe — always returns ok if process is running' })
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — checks DB, Redis, MinIO, Memory, Disk' })
  readiness() {
    return this.health.check([
      // PostgreSQL
      () => this.db.pingCheck('database'),

      // Redis — BullMQ und Session-Caching hängen davon ab
      async (): Promise<HealthIndicatorResult> => {
        try {
          const pong = await this.redisClient.ping();
          const isHealthy = pong === 'PONG';
          return {
            redis: {
              status: isHealthy ? 'up' : 'down',
            },
          };
        } catch (err) {
          return {
            redis: {
              status: 'down',
              message: (err as Error).message,
            },
          };
        }
      },

      // MinIO — Vault und Datei-Uploads hängen davon ab
      async (): Promise<HealthIndicatorResult> => {
        try {
          const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'minio');
          const port = this.configService.get<number>('MINIO_PORT', 9000);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);

          const res = await fetch(`http://${endpoint}:${port}/minio/health/live`, {
            signal: controller.signal,
          }).finally(() => clearTimeout(timeout));

          return {
            minio: {
              status: res.ok ? 'up' : 'down',
              httpStatus: res.status,
            },
          };
        } catch (err) {
          return {
            minio: {
              status: 'down',
              message: (err as Error).message,
            },
          };
        }
      },

      // Memory
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),

      // Disk
      () => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }
}
