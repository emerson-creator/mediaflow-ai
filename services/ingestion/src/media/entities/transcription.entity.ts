import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Media } from './media.entity';

@Entity('transcriptions')
export class Transcription {
  // Same id as the related Media row (1:1 relationship), matching
  // the original hand-written schema: media_id UUID PRIMARY KEY.
  @PrimaryColumn('uuid', { name: 'media_id' })
  mediaId: string;

  @OneToOne(() => Media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;

  @Column('text')
  transcript: string;

  @Column('text')
  summary: string;

  @Column('text', { array: true, default: '{}' })
  keywords: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}