import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;

  private readonly bucketPublic: string;
  private readonly bucketVault: string;
  private readonly bucketBackups: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: configService.get<string>('app.minio.endpoint', 'minio'),
      port: configService.get<number>('app.minio.port', 9000),
      useSSL: configService.get<boolean>('app.minio.useSSL', false),
      accessKey: configService.get<string>('app.minio.rootUser', ''),
      secretKey: configService.get<string>('app.minio.rootPassword', ''),
    });

    this.bucketPublic = configService.get<string>('app.minio.bucketPublic', 'family-assets');
    this.bucketVault = configService.get<string>('app.minio.bucketVault', 'family-vault');
    this.bucketBackups = configService.get<string>('app.minio.bucketBackups', 'family-backups');
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucketsExist();
  }

  private async ensureBucketsExist(): Promise<void> {
    const buckets = [
      { name: this.bucketPublic, policy: 'download' },
      { name: this.bucketVault, policy: 'none' },    // Private!
      { name: this.bucketBackups, policy: 'none' },  // Private!
    ];

    for (const bucket of buckets) {
      const exists = await this.client.bucketExists(bucket.name);
      if (!exists) {
        await this.client.makeBucket(bucket.name, 'eu-west-1');
        this.logger.log(`Created bucket: ${bucket.name}`);

        if (bucket.policy === 'download') {
          // Public download only policy (kein List, kein Upload)
          const policy = JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucket.name}/public/*`],
              },
            ],
          });
          await this.client.setBucketPolicy(bucket.name, policy);
        }
      }
    }
  }

  getClient(): Minio.Client {
    return this.client;
  }

  getBucketPublic(): string {
    return this.bucketPublic;
  }

  getBucketVault(): string {
    return this.bucketVault;
  }

  getBucketBackups(): string {
    return this.bucketBackups;
  }

  async putObject(
    bucket: string,
    objectKey: string,
    data: Buffer,
    size: number,
    metadata: Record<string, string> = {},
  ): Promise<Minio.UploadedObjectInfo> {
    return this.client.putObject(bucket, objectKey, data, size, metadata);
  }

  async getObject(bucket: string, objectKey: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      let data = Buffer.alloc(0);
      this.client.getObject(bucket, objectKey, (err, stream) => {
        if (err) return reject(err);
        stream.on('data', (chunk: Buffer) => {
          data = Buffer.concat([data, chunk]);
        });
        stream.on('end', () => resolve(data));
        stream.on('error', reject);
      });
    });
  }

  async presignedGetUrl(
    bucket: string,
    objectKey: string,
    expirySeconds = 60,
  ): Promise<string> {
    return this.client.presignedGetObject(bucket, objectKey, expirySeconds);
  }

  async removeObject(bucket: string, objectKey: string): Promise<void> {
    return this.client.removeObject(bucket, objectKey);
  }

  async statObject(bucket: string, objectKey: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(bucket, objectKey);
  }
}
