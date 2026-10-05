import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly expiresIn: number;
  private readonly s3Client: S3Client;

  constructor(config: ConfigService) {
    const s3 = config.getOrThrow('s3');
    this.bucket = s3.bucket;
    this.expiresIn = s3.presignExpiresSeconds;

    // Cliente único nativo de AWS S3
    this.s3Client = new S3Client({
      region: s3.region,
      credentials: {
        accessKeyId: s3.accessKey,
        secretAccessKey: s3.secretKey,
      },
    });
  }

  async createUploadUrl(
    objectKey: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: this.expiresIn,
    });
  }

  /** Devuelve metadata del objeto o null si no existe */
  async headObject(objectKey: string) {
    try {
      return await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
        return null;
      }
      throw err;
    }
  }

  get bucketName() {
    return this.bucket;
  }

  async healthCheck(): Promise<HealthIndicatorResult> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { s3: { status: 'up' } };
    } catch {
      return { s3: { status: 'down' } };
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  async createDownloadUrl(objectKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}
