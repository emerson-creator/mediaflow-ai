import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { StorageService } from '../storage/storage.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { Media, MediaStatus, MediaSourceType } from './entities/media.entity';
import { CreateYoutubeUploadDto } from './dto/create-youtube-upload.dto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { Transcription } from './entities/transcription.entity';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly repo: Repository<Media>,

    @InjectRepository(Transcription)
    private readonly transcriptionRepo: Repository<Transcription>,

    private readonly storage: StorageService,
    private readonly rabbit: RabbitMQService,
    @InjectPinoLogger(MediaService.name) private readonly logger: PinoLogger,
  ) {}

  async createUpload(dto: CreateUploadDto, userId: string) {
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const media = await this.repo.save(
      this.repo.create({
        userId,
        filename: safeName,
        mimeType: dto.mimeType,
        sizeBytes: String(dto.sizeBytes),
        objectKey: 'pending',
      }),
    );

    media.objectKey = `uploads/${userId}/${media.id}/${safeName}`;
    await this.repo.save(media);

    // mediaId as a structured field, not interpolated into the message —
    // this is what makes it filterable/searchable later.
    this.logger.info({ mediaId: media.id, userId }, 'Upload URL requested');

    const uploadUrl = await this.storage.createUploadUrl(
      media.objectKey,
      dto.mimeType,
    );

    return { mediaId: media.id, uploadUrl, expiresInSeconds: 900 };
  }

  async confirmUpload(mediaId: string) {
    const media = await this.repo.findOneBy({ id: mediaId });
    if (!media) throw new NotFoundException('Media not found');

    if (media.status !== MediaStatus.PENDING_UPLOAD) {
      this.logger.warn(
        { mediaId, currentStatus: media.status },
        'Confirm attempted on media not in PENDING_UPLOAD state',
      );
      throw new ConflictException(`Current status: ${media.status}`);
    }

    const head = await this.storage.headObject(media.objectKey!);
    if (!head) {
      this.logger.warn(
        { mediaId },
        'Confirm attempted but object not found in storage',
      );
      throw new BadRequestException('File does not exist in storage yet');
    }

    media.status = MediaStatus.UPLOADED;
    await this.repo.save(media);

    const eventId = randomUUID();

    await this.rabbit.publish('media.uploaded', {
      eventId,
      mediaId: media.id,
      userId: media.userId,
      bucket: this.storage.bucketName,
      objectKey: media.objectKey,
      mimeType: media.mimeType,
      sizeBytes: Number(media.sizeBytes),
      attempt: 1,
      occurredAt: new Date().toISOString(),
    });

    this.logger.info({ mediaId, eventId }, 'media.uploaded event published');

    return { mediaId: media.id, status: media.status };
  }

  async findAllForUser(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(id: string, userId: string) {
    const media = await this.repo.findOneBy({ id, userId });
    if (!media) throw new NotFoundException('Media not found for this user');
    return media;
  }

  async createYoutubeUpload(dto: CreateYoutubeUploadDto, userId: string) {
    const media = await this.repo.save(
      this.repo.create({
        userId,
        sourceType: MediaSourceType.YOUTUBE,
        sourceUrl: dto.url,
        filename: dto.url, // placeholder until the Worker fetches the real title
        status: MediaStatus.QUEUED,
        objectKey: null,
        mimeType: null,
        sizeBytes: null,
      }),
    );

    const eventId = randomUUID();

    await this.rabbit.publish('media.youtube_requested', {
      eventId,
      mediaId: media.id,
      userId,
      sourceUrl: dto.url,
      attempt: 1,
      occurredAt: new Date().toISOString(),
    });

    this.logger.info(
      { mediaId: media.id, eventId },
      'media.youtube_requested event published',
    );

    return { mediaId: media.id, status: media.status };
  }
  async findDetailsForUser(id: string, userId: string) {
    const media = await this.repo.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found for this user');
    }

    const transcription = await this.transcriptionRepo.findOne({
      where: {
        mediaId: media.id,
      },
    });

    return {
      media: {
        id: media.id,
        filename: media.filename,
        sourceType: media.sourceType,
        sourceUrl: media.sourceUrl,
        title: media.title,
        thumbnailUrl: media.thumbnailUrl,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        status: media.status,
        createdAt: media.createdAt,
        updatedAt: media.updatedAt,
      },

      transcription: transcription
        ? {
            transcript: transcription.transcript,
            summary: transcription.summary,
            keywords: transcription.keywords,
            segments: transcription.segments,
            createdAt: transcription.createdAt,
          }
        : null,
    };
  }
  // En media.service.ts, añade:

  async getPlaybackInfo(mediaId: string, userId: string) {
    const media = await this.repo.findOneBy({ id: mediaId, userId });
    if (!media) throw new NotFoundException('Media not found');

    if (media.status !== MediaStatus.DONE) {
      throw new ConflictException('Media is not ready for playback yet');
    }

    if (media.sourceType === MediaSourceType.YOUTUBE) {
      return {
        playbackType: 'youtube' as const,
        youtubeUrl: media.sourceUrl,
      };
    }

    // UPLOAD: generate a short-lived presigned GET URL to MinIO.
    if (!media.objectKey) {
      throw new ConflictException('No stored file found for this media');
    }

    const playbackUrl = await this.storage.createDownloadUrl(media.objectKey);
    return {
      playbackType: 'direct' as const,
      playbackUrl,
      mimeType: media.mimeType,
    };
  }
}
