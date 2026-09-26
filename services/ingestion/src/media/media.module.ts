import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { MediaController } from './media.controller';
import { Media } from './entities/media.entity';
import { MediaService } from './media.service';
import { Transcription } from './entities/transcription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Media, Transcription]), StorageModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}