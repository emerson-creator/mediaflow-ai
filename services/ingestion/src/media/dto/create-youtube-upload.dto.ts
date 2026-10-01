import { IsUrl, Matches } from 'class-validator';

// Deliberately strict: only youtube.com/watch?v= and youtu.be/ shortlinks.
// Rejects playlists, channels, shorts URLs with extra params we don't
// want to deal with yet — better to reject early with a clear error
// than let yt-dlp fail cryptically downstream.
const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+)/;

export class CreateYoutubeUploadDto {
  @IsUrl()
  @Matches(YOUTUBE_URL_PATTERN, {
    message:
      'Must be a valid YouTube video URL (youtube.com/watch or youtu.be)',
  })
  url: string;
}
