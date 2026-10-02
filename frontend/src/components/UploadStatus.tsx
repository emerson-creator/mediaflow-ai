import { X } from "lucide-react";
import type { UploadPhase } from "../hooks/useUpload";

interface Props {
  phase: UploadPhase;
  percent: number;
  fileName: string;
  error: string | null;
  onCancel: () => void;
  onDismissError: () => void;
}

const PHASE_LABELS: Record<Exclude<UploadPhase, "idle">, string> = {
  preparing: "Preparing upload",
  uploading: "Uploading",
  confirming: "Starting pipeline",
};

/** Franja de progreso de subida: la subida sigue aunque el usuario navegue por la lista. */
export function UploadStatus({
  phase,
  percent,
  fileName,
  error,
  onCancel,
  onDismissError,
}: Props) {
  if (phase === "idle" && !error) return null;

  if (phase === "idle" && error) {
    return (
      <div
        role="alert"
        className="mb-6 flex items-center justify-between gap-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad"
      >
        <span>{error}</span>
        <button
          type="button"
          onClick={onDismissError}
          aria-label="Dismiss"
          className="text-bad/80 transition-colors hover:text-bad"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    );
  }

  const isUploading = phase === "uploading";
  const canCancel = phase === "preparing" || phase === "uploading";

  return (
    <div
      aria-live="polite"
      className="mb-6 rounded-lg border border-line bg-panel px-4 py-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="truncate">{fileName}</span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-ink-dim">
          {isUploading ? `${percent}%` : ""}
        </span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isUploading ? percent : undefined}
        aria-label="Upload progress"
      >
        <div
          className="h-full rounded-full bg-run transition-[width] duration-200"
          style={{
            width: isUploading ? `${percent}%` : "100%",
            opacity: isUploading ? 1 : 0.4,
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-dim">
        <span>{PHASE_LABELS[phase as Exclude<UploadPhase, "idle">]}</span>
        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 transition-colors hover:text-ink"
          >
            <X size={12} aria-hidden /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
