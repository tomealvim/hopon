import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'hopon-avatars');
    this.publicUrl = config.get<string>('S3_PUBLIC_URL', '');

    const endpoint = config.get<string>('S3_ENDPOINT');
    this.enabled = !!endpoint;

    if (this.enabled) {
      this.client = new S3Client({
        endpoint,
        region: config.get<string>('S3_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: config.get<string>('S3_ACCESS_KEY', ''),
          secretAccessKey: config.get<string>('S3_SECRET_KEY', ''),
        },
        forcePathStyle: true, // necessário para MinIO e R2 com endpoint personalizado
      });
    } else {
      this.logger.warn('S3_ENDPOINT não definido — upload de avatars desativado.');
    }
  }

  async uploadAvatar(userId: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Upload de avatars não está configurado neste servidor.');
    }

    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const key = `avatars/${userId}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'max-age=31536000', // 1 ano — URL é determinística por userId
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`Avatar uploaded: ${url}`);
    return url;
  }

  async uploadIdentityDocument(
    userId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Upload de documentos não está configurado neste servidor.',
      );
    }

    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const uuid = randomUUID();
    const key = `identity/${userId}/${uuid}.${ext}`;

    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`Identity document uploaded: ${url}`);
    return url;
  }
}
