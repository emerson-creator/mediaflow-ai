export interface User {
  id: string;
  email: string;
}

export type MediaSourceType = "UPLOAD" | "YOUTUBE";

export interface MediaItem {
  id: string;
  sourceType: MediaSourceType;
  filename: string;
  title: string | null;
  thumbnailUrl: string | null;
  sourceUrl: string | null;
  mimeType: string | null;
  status: MediaStatus;
  createdAt: string;
}

export type MediaStatus =
  | "PENDING_UPLOAD"
  | "QUEUED"
  | "UPLOADED"
  | "PROCESSING"
  | "DONE"
  | "FAILED"
  | "EXPIRED";

export interface ProgressEvent {
  mediaId: string;
  userId: string;
  stage:
    | "FETCHING_METADATA"
    | "DOWNLOADING"
    | "EXTRACTING_AUDIO"
    | "TRANSCRIBING"
    | "SUMMARIZING"
    | "DONE"
    | "FAILED";
  progress: number;
  message?: string;
  occurredAt: string;
}

// AÑADE esto a src/types/index.ts (sin tocar lo existente).
// Los campos salen del JSON real de GET /media/:id/details y del endpoint de playback.

export interface TranscriptSegment {
  start: number; // segundos
  end: number; // segundos
  text: string;
}

export interface Transcription {
  transcript: string;
  summary: string;
  keywords: string[];
  segments: TranscriptSegment[];
  createdAt: string;
}

// `media` en /details trae más campos que el listado.
// sizeBytes llega como string porque TypeORM serializa bigint así.
export interface MediaDetail extends MediaItem {
  sizeBytes: string | null;
  updatedAt: string;
}

export interface MediaDetails {
  media: MediaDetail;
  // Asumido null mientras el procesamiento no termina: verifícalo contra el backend.
  transcription: Transcription | null;
}

export interface PlaybackInfo {
  playbackType: string; // hoy solo se ha visto "direct"
  playbackUrl: string;
  mimeType: string;
}
