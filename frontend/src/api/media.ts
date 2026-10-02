import axios from "axios";
import { apiClient } from "./client";
import type { MediaItem } from "../types";
import type { MediaDetails, PlaybackInfo } from "../types";

interface CreateUploadResponse {
  mediaId: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export async function createUpload(file: File): Promise<CreateUploadResponse> {
  const { data } = await apiClient.post<CreateUploadResponse>(
    "/media/uploads",
    {
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  );
  return data;
}

interface UploadToStorageOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export async function uploadToStorage(
  uploadUrl: string,
  file: File,
  options: UploadToStorageOptions = {},
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: { "Content-Type": file.type },
    signal: options.signal,
    onUploadProgress: (event) => {
      if (event.total) {
        options.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
}

export async function confirmUpload(
  mediaId: string,
): Promise<{ mediaId: string; status: string }> {
  const { data } = await apiClient.post("/media/uploads/confirm", { mediaId });
  return data;
}

export async function getMedia(mediaId: string): Promise<MediaItem> {
  const { data } = await apiClient.get<MediaItem>(`/media/${mediaId}`);
  return data;
}

export async function listMedia(): Promise<MediaItem[]> {
  const { data } = await apiClient.get<MediaItem[]>("/media");
  return data;
}

export async function createYoutubeUpload(
  url: string,
): Promise<{ mediaId: string; status: string }> {
  const { data } = await apiClient.post("/media/from-youtube", { url });
  return data;
}

const playbackPath = (mediaId: string) => `/media/${mediaId}/playback`;

export async function getMediaDetails(mediaId: string): Promise<MediaDetails> {
  const { data } = await apiClient.get<MediaDetails>(
    `/media/${mediaId}/details`,
  );
  return data;
}

export async function getPlayback(mediaId: string): Promise<PlaybackInfo> {
  const { data } = await apiClient.get<PlaybackInfo>(playbackPath(mediaId));
  return data;
}
