export interface User {
  id: string;
  email: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  status: MediaStatus;
  createdAt: string;
}

export type MediaStatus =
  | "PENDING_UPLOAD"
  | "UPLOADED"
  | "PROCESSING"
  | "DONE"
  | "FAILED";

export interface ProgressEvent {
  mediaId: string;
  userId: string;
  stage:
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
