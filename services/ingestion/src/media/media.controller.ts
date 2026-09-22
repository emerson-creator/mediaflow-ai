import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { CreateUploadDto } from './dto/create-upload.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads')
  create(@Body() dto: CreateUploadDto) {
    return this.media.createUpload(dto);
  }

  @Post('uploads/confirm')
  confirm(@Body() dto: ConfirmUploadDto) {
    return this.media.confirmUpload(dto.mediaId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.findOne(id);
  }
}
