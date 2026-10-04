import { useRef, useState } from "react";
import { ArrowUp, Link2, Plus, Upload, Video } from "lucide-react";
import * as mediaApi from "../api/media";
import type { UploadController } from "../hooks/useUpload";

interface Props {
  upload: UploadController;
  /** Se llama tras encolar un link de YouTube con éxito. */
  onQueued: () => void;
}

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;

const chipClass =
  "inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-medium text-ink-dim transition-colors hover:border-line-strong hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

export function Composer({ upload, onQueued }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = url.trim() !== "" && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = url.trim();

    if (!YOUTUBE_URL_PATTERN.test(value)) {
      setError("Enter a valid YouTube URL (youtube.com/watch or youtu.be).");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await mediaApi.createYoutubeUpload(value);
      setUrl("");
      onQueued();
    } catch (err: unknown) {
      const message = (
        err as {
          response?: {
            data?: {
              message?: unknown;
            };
          };
        }
      ).response?.data?.message;

      setError(
        Array.isArray(message)
          ? String(message[0])
          : typeof message === "string"
            ? message
            : "Could not process that YouTube URL.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (file) {
      void upload.start(file);
    }

    e.target.value = "";
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-line bg-panel/90 p-2 shadow-[0_20px_70px_rgba(0,0,0,0.08)] backdrop-blur">
        <form onSubmit={handleSubmit}>
          {/* Main input */}
          <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-2 py-2 transition-colors focus-within:border-line-strong focus-within:ring-4 focus-within:ring-ink/[0.03]">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isBusy}
              aria-label="Upload a file"
              title="Upload a file"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-panel text-ink-dim transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={18} aria-hidden />
            </button>

            <input
              ref={urlRef}
              type="text"
              inputMode="url"
              autoFocus
              autoComplete="off"
              placeholder="Paste a YouTube link or drop a file here"
              aria-label="YouTube link"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);

                if (error) {
                  setError(null);
                }
              }}
              disabled={isSubmitting}
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={!canSubmit}
              aria-label="Process link"
              title="Process link"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink text-canvas shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
            >
              <ArrowUp size={18} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint sm:inline">
                Input
              </span>

              <span className="hidden h-3 w-px bg-line sm:inline" />

              <span className="truncate text-xs text-ink-faint">
                Supports audio, video and YouTube
              </span>
            </div>

            <div className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] font-medium text-ink-faint">
              ⌘ + Enter
            </div>
          </div>
        </form>

        {/* Quick actions */}
        <div className="mt-2 flex flex-wrap items-center gap-2 px-1 pb-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isBusy}
            className={chipClass}
          >
            <Upload size={14} aria-hidden />
            Upload file
          </button>

          <button
            type="button"
            onClick={() => urlRef.current?.focus()}
            className={chipClass}
          >
            <Link2 size={14} aria-hidden />
            YouTube link
          </button>

          <div className="ml-auto hidden items-center gap-1.5 text-[11px] text-ink-faint sm:flex">
            <Video size={13} aria-hidden />
            <span>YouTube ingestion enabled</span>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileChange}
        tabIndex={-1}
        className="sr-only"
      />

      {error && (
        <div
          role="alert"
          className="mx-2 mt-3 rounded-lg border border-bad/20 bg-bad/5 px-3 py-2 text-left text-sm text-bad"
        >
          {error}
        </div>
      )}
    </div>
  );
}
