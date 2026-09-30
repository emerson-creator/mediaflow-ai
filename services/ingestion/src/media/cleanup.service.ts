import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service';
import { Media, MediaStatus } from './entities/media.entity';

const ORPHAN_THRESHOLD_HOURS = 24;

@Injectable()
export class CleanupService {
  constructor(
    @InjectRepository(Media) private readonly repo: Repository<Media>,
    private readonly storage: StorageService,
    @InjectPinoLogger(CleanupService.name) private readonly logger: PinoLogger,
  ) {}

  // Runs once a day at 3 AM. Adjust the schedule as needed; this is a
  // low-priority background job, no reason to run it more often.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOrphanedUploads(): Promise<void> {
    const cutoff = new Date(
      Date.now() - ORPHAN_THRESHOLD_HOURS * 60 * 60 * 1000,
    );

    const orphans = await this.repo.find({
      where: {
        status: MediaStatus.PENDING_UPLOAD,
        createdAt: LessThan(cutoff),
      },
    });

    if (orphans.length === 0) {
      this.logger.info('No orphaned uploads found');
      return;
    }

    this.logger.info({ count: orphans.length }, 'Cleaning up orphaned uploads');

    for (const media of orphans) {
      try {
        // The upload might have partially succeeded even though confirm()
        // was never called (e.g. the PUT to MinIO finished but the browser
        // crashed before the confirm request). Best-effort delete either way.
        await this.storage.deleteObject(media.objectKey);
      } catch (err) {
        // Not fatal: the object may simply never have existed. Log and
        // continue — we still want to mark the DB row as expired below.
        this.logger.warn(
          { mediaId: media.id, error: (err as Error).message },
          'Could not delete storage object during cleanup (may not exist)',
        );
      }

      media.status = MediaStatus.EXPIRED;
      await this.repo.save(media);
      this.logger.info(
        { mediaId: media.id },
        'Marked orphaned upload as EXPIRED',
      );
    }
  }
}
