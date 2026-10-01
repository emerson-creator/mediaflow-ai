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
