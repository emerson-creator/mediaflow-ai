import { useRef, useState } from "react";
import axios from "axios";
import { UploadCloud, X } from "lucide-react";
import * as mediaApi from "../api/media";

interface Props {
  onUploaded: () => void;
}

type Mode = "file" | "youtube";
type Phase = "idle" | "preparing" | "uploading" | "confirming";

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;

const PHASE_LABELS: Record<Exclude<Phase, "idle">, string> = {
  preparing: "Preparing upload",
  uploading: "Uploading",
  confirming: "Starting pipeline",
};

const inputClass =
  "flex-1 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none disabled:opacity-50";

export function UploadForm({ onUploaded }: Props) {
  const [mode, setMode] = useState<Mode>("file");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUploading = phase !== "idle";

  async function startUpload(file: File) {
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
      onUploaded();
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void startUpload(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void startUpload(file);
  }

  async function handleYoutubeSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!YOUTUBE_URL_PATTERN.test(youtubeUrl)) {
      setError("Enter a valid YouTube URL (youtube.com/watch or youtu.be).");
      return;
    }

    setError(null);
    setIsSubmittingUrl(true);
    try {
      await mediaApi.createYoutubeUpload(youtubeUrl);
      setYoutubeUrl("");
      onUploaded();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: unknown } } })
        .response?.data?.message;
      setError(
        Array.isArray(message)
          ? String(message[0])
          : typeof message === "string"
            ? message
            : "Could not process that YouTube URL.",
      );
    } finally {
      setIsSubmittingUrl(false);
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm transition-colors ${
      active ? "bg-hover text-ink" : "text-ink-dim hover:text-ink"
    }`;

  return (
    <div>
      <div className="mb-3 flex w-fit gap-1 rounded-lg border border-line bg-panel p-1">
        <button
          type="button"
          aria-pressed={mode === "file"}
          onClick={() => setMode("file")}
          className={tabClass(mode === "file")}
        >
          Upload file
        </button>
        <button
          type="button"
          aria-pressed={mode === "youtube"}
          onClick={() => setMode("youtube")}
          className={tabClass(mode === "youtube")}
        >
          YouTube link
        </button>
      </div>

      {mode === "file" ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors focus-within:border-run ${
            isDragging
              ? "border-run bg-hover"
              : "border-line-strong bg-panel hover:bg-hover"
          } ${isUploading ? "cursor-default" : "cursor-pointer"}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            disabled={isUploading}
            onChange={handleFileChange}
            className="sr-only"
          />

          {isUploading ? (
            <div className="w-full max-w-md" aria-live="polite">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-left">{fileName}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-ink-dim">
                  {phase === "uploading" ? `${percent}%` : ""}
                </span>
              </div>
              <div
                className="h-1 w-full overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={phase === "uploading" ? percent : undefined}
              >
                <div
                  className="h-full rounded-full bg-run transition-[width] duration-200"
                  style={{
                    width: phase === "uploading" ? `${percent}%` : "100%",
                    opacity: phase === "uploading" ? 1 : 0.4,
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-dim">
                <span>{PHASE_LABELS[phase as Exclude<Phase, "idle">]}</span>
                {(phase === "preparing" || phase === "uploading") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      abortRef.current?.abort();
                    }}
                    className="inline-flex items-center gap-1 text-ink-dim hover:text-ink"
                  >
                    <X size={12} aria-hidden /> Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <UploadCloud size={20} className="text-ink-faint" aria-hidden />
              <p className="text-sm">
                Drop an audio or video file, or{" "}
                <span className="underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-ink-faint">
                It uploads directly to storage, then the pipeline starts.
              </p>
            </>
          )}
        </label>
      ) : (
        <form onSubmit={handleYoutubeSubmit} className="flex max-w-xl gap-2">
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={isSubmittingUrl}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={isSubmittingUrl || !youtubeUrl}
            className="whitespace-nowrap rounded-md bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isSubmittingUrl ? "Queuing..." : "Process link"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
