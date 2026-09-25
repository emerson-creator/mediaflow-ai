import axios from "axios";
import { apiClient } from "./client";
import type { MediaItem } from "../types";

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

// Direct PUT to MinIO's presigned URL — NOT through the Gateway/apiClient,
// since this goes straight to storage, bypassing our backend entirely.
export async function uploadToStorage(
  uploadUrl: string,
  file: File,
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: { "Content-Type": file.type },
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
