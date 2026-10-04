import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import * as mediaApi from "../api/media";

export type UploadPhase = "idle" | "preparing" | "uploading" | "confirming";

/**
 * Flujo de subida directo a MinIO (presigned URL):
 * createUpload -> PUT a storage (Axios plano) -> confirmUpload.
 * Los bytes nunca pasan por el Gateway.
 */
export function useUpload(onUploaded: () => void) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [percent, setPercent] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const onUploadedRef = useRef(onUploaded);

  useEffect(() => {
    onUploadedRef.current = onUploaded;
  });

  const start = useCallback(async (file: File) => {
    if (abortRef.current) return; // ya hay una subida en curso

    if (!/^(audio|video)\//.test(file.type)) {
      setError("Only audio and video files are supported.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setFileName(file.name);
    setPercent(0);
    setPhase("preparing");

    try {
      const { mediaId, uploadUrl } = await mediaApi.createUpload(file);
      setPhase("uploading");
      await mediaApi.uploadToStorage(uploadUrl, file, {
        signal: controller.signal,
        onProgress: setPercent,
      });
      setPhase("confirming");
      await mediaApi.confirmUpload(mediaId);
      onUploadedRef.current();
    } catch (err) {
      if (axios.isCancel(err)) {
        setError("Upload canceled.");
      } else {
        console.error(err);
        setError("Upload failed. Check your connection and try again.");
      }
    } finally {
      abortRef.current = null;
      setPhase("idle");
    }
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const dismissError = useCallback(() => setError(null), []);

  return {
    phase,
    percent,
    fileName,
    error,
    isBusy: phase !== "idle",
    start,
    cancel,
    dismissError,
  };
}

export type UploadController = ReturnType<typeof useUpload>;
