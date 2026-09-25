import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { CreateUploadDto } from './dto/create-upload.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads')
  create(@Body() dto: CreateUploadDto, @Headers('x-user-id') userId: string) {
    if (!userId) {
      // This header is set by the Gateway, which is the only way to reach this service.
      // So if it's missing, it means the request is coming from an untrusted source.
      throw new BadRequestException('Missing x-user-id header');
    }
    return this.media.createUpload(dto, userId);
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
