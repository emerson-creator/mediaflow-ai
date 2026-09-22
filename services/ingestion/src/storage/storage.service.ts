import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly expiresIn: number;
  // Cliente para operaciones server-side (red interna)
  private readonly internalClient: S3Client;
  // Cliente SOLO para firmar URLs con el host que verá el navegador
  private readonly signingClient: S3Client;

  constructor(config: ConfigService) {
    const s3 = config.getOrThrow('s3');
    this.bucket = s3.bucket;
    this.expiresIn = s3.presignExpiresSeconds;

    const common = {
      region: s3.region,
      forcePathStyle: true, // obligatorio para MinIO
      credentials: { accessKeyId: s3.accessKey, secretAccessKey: s3.secretKey },
    };

    this.internalClient = new S3Client({ ...common, endpoint: s3.endpoint });
    this.signingClient = new S3Client({
      ...common,
      endpoint: s3.publicEndpoint,
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
    return getSignedUrl(this.signingClient, command, {
      expiresIn: this.expiresIn,
    });
  }

  /** Devuelve metadata del objeto o null si no existe */
  async headObject(objectKey: string) {
    try {
      return await this.internalClient.send(
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
}
