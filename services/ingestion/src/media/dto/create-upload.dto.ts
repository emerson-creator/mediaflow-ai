import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const ALLOWED_MIME = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export class CreateUploadDto {
  // TEMPORAL: en la Fase 4 esto vendrá del JWT, no del body
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsIn(ALLOWED_MIME)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(500 * 1024 * 1024) // 500 MB
  sizeBytes: number;
}
