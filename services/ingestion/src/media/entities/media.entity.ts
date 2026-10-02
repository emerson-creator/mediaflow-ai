import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Transcription } from './transcription.entity';

export enum MediaStatus {
  PENDING_UPLOAD = 'PENDING_UPLOAD',
  QUEUED = 'QUEUED', // NEW: youtube requested, not started yet
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum MediaSourceType {
  UPLOAD = 'UPLOAD',
  YOUTUBE = 'YOUTUBE',
}

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: MediaSourceType,
    default: MediaSourceType.UPLOAD,
  })
  sourceType: MediaSourceType;

  // For UPLOAD: the original filename. For YOUTUBE: filled in once the
  // Worker fetches real metadata (falls back to the URL until then).
  @Column()
  filename: string;

  // NEW: only set for YOUTUBE. The original video URL.
  @Column({ type: 'text', nullable: true })
  sourceUrl: string | null;

  // NEW: real video title from YouTube metadata, once fetched.
  @Column({ type: 'text', nullable: true })
  title: string | null;

  // NEW: thumbnail URL from YouTube metadata.
  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'text', nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  sizeBytes: string | null;

  // Nullable now: for YOUTUBE, this isn't known until the Worker
  // downloads and uploads the audio to MinIO.
  @Column({ type: 'text', nullable: true })
  objectKey: string | null;

  @OneToOne(() => Transcription, (transcription) => transcription.media)
  transcription: Transcription;

  @Column({
    type: 'enum',
    enum: MediaStatus,
    default: MediaStatus.PENDING_UPLOAD,
  })
  status: MediaStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
