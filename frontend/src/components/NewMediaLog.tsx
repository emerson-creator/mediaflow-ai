import { useEffect, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import * as mediaApi from "../api/media";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Se llama con el archivo elegido; la subida la gestiona el dashboard. */
  onFile: (file: File) => void;
  /** Se llama tras encolar un link de YouTube con éxito. */
  onYoutubeQueued: () => void;
}

type Mode = "file" | "youtube";

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;

export function NewMediaDialog({
  open,
  onClose,
  onFile,
  onYoutubeQueued,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        // Clic en el backdrop (el target es el propio <dialog>).
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="new-media-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-panel p-0 text-ink shadow-2xl shadow-black/60 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {open && (
        <DialogBody
          onClose={onClose}
          onFile={onFile}
          onYoutubeQueued={onYoutubeQueued}
        />
      )}
    </dialog>
  );
}

function DialogBody({ onClose, onFile, onYoutubeQueued }: Omit<Props, "open">) {
  const [mode, setMode] = useState<Mode>("file");
  const [isDragging, setIsDragging] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(file: File | undefined) {
    if (!file) return;
    onFile(file);
    onClose();
  }

  async function handleYoutubeSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!YOUTUBE_URL_PATTERN.test(youtubeUrl)) {
      setError("Enter a valid YouTube URL (youtube.com/watch or youtu.be).");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await mediaApi.createYoutubeUpload(youtubeUrl);
      onYoutubeQueued();
      onClose();
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
      setIsSubmitting(false);
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm transition-colors ${
      active ? "bg-hover text-ink" : "text-ink-dim hover:text-ink"
    }`;

  return (
    <div className="p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="new-media-title" className="text-lg font-semibold">
            New media
          </h2>
          <p className="mt-1 text-sm text-ink-dim">
            Add a file or a YouTube link to run it through the pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-faint transition-colors hover:text-ink"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      <div className="mb-4 flex w-fit gap-1 rounded-lg border border-line bg-canvas p-1">
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
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors focus-within:border-run ${
            isDragging
              ? "border-run bg-hover"
              : "border-line-strong bg-canvas hover:bg-hover"
          }`}
        >
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => pick(e.target.files?.[0])}
            className="sr-only"
          />
          <UploadCloud size={20} className="text-ink-faint" aria-hidden />
          <p className="text-sm">
            Drop an audio or video file, or{" "}
            <span className="underline underline-offset-2">browse</span>
          </p>
        </label>
      ) : (
        <form onSubmit={handleYoutubeSubmit} className="flex gap-2">
          <input
            type="url"
            autoFocus
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={isSubmitting}
            aria-label="YouTube URL"
            className="flex-1 rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSubmitting || !youtubeUrl}
            className="whitespace-nowrap rounded-md bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isSubmitting ? "Queuing..." : "Process link"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-bad">
          {error}
        </p>
      )}

      <p className="mt-5 text-xs text-ink-faint">
        Files upload straight to object storage; the API only coordinates the
        pipeline.
      </p>
    </div>
  );
}
