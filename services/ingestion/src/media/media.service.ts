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
import { Media, MediaStatus } from './entities/media.entity';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media) private readonly repo: Repository<Media>,
    private readonly storage: StorageService,
    private readonly rabbit: RabbitMQService,
  ) {}

  async createUpload(dto: CreateUploadDto) {
    // Sanitizamos el nombre para evitar path traversal en el objectKey
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    const media = await this.repo.save(
      this.repo.create({
        userId: dto.userId,
        filename: safeName,
        mimeType: dto.mimeType,
        sizeBytes: String(dto.sizeBytes),
        objectKey: 'pending', // se completa abajo, necesitamos el id
      }),
    );

    media.objectKey = `uploads/${dto.userId}/${media.id}/${safeName}`;
    await this.repo.save(media);

    const uploadUrl = await this.storage.createUploadUrl(
      media.objectKey,
      dto.mimeType,
    );

    return { mediaId: media.id, uploadUrl, expiresInSeconds: 900 };
  }

  async confirmUpload(mediaId: string) {
    const media = await this.repo.findOneBy({ id: mediaId });
    if (!media) throw new NotFoundException('Media no encontrada');

    if (media.status !== MediaStatus.PENDING_UPLOAD) {
      throw new ConflictException(`Estado actual: ${media.status}`);
    }

    // Verificamos que el cliente realmente subió el archivo
    const head = await this.storage.headObject(media.objectKey);
    if (!head) {
      throw new BadRequestException('El archivo aún no existe en el storage');
    }

    media.status = MediaStatus.UPLOADED;
    await this.repo.save(media);

    await this.rabbit.publish('media.uploaded', {
      mediaId: media.id,
      userId: media.userId,
      bucket: this.storage.bucketName,
      objectKey: media.objectKey,
      mimeType: media.mimeType,
      sizeBytes: Number(media.sizeBytes),
      occurredAt: new Date().toISOString(),
    });

    return { mediaId: media.id, status: media.status };
  }

  async findOne(id: string) {
    const media = await this.repo.findOneBy({ id });
    if (!media) throw new NotFoundException('Media no encontrada');
    return media;
  }
}
