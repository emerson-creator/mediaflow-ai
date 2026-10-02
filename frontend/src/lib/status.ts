import type { MediaItem, ProgressEvent } from "../types";

export type Tone = "idle" | "run" | "ok" | "bad" | "muted";

export const STATUS_LABELS: Record<string, string> = {
  PENDING_UPLOAD: "Pending upload",
  QUEUED: "Queued",
  UPLOADED: "Uploaded",
  PROCESSING: "Processing",
  FETCHING_METADATA: "Fetching info",
  DOWNLOADING: "Downloading",
  EXTRACTING_AUDIO: "Extracting audio",
  TRANSCRIBING: "Transcribing",
  SUMMARIZING: "Summarizing",
  DONE: "Completed",
  FAILED: "Failed",
  EXPIRED: "Expired",
};

const ACTIVE = new Set([
  "QUEUED",
  "UPLOADED",
  "PROCESSING",
  "FETCHING_METADATA",
  "DOWNLOADING",
  "EXTRACTING_AUDIO",
  "TRANSCRIBING",
  "SUMMARIZING",
]);

export function toneOf(status: string): Tone {
  if (status === "DONE") return "ok";
  if (status === "FAILED") return "bad";
  if (status === "EXPIRED") return "muted";
  if (ACTIVE.has(status)) return "run";
  return "idle";
}

export function isActive(status: string): boolean {
  return ACTIVE.has(status);
}

/** El evento en vivo gana sobre el último estado persistido. */
export function resolveStatus(item: MediaItem, live?: ProgressEvent): string {
  return live?.stage ?? item.status;
}

/** Etapas del worker. Un archivo subido no pasa por metadata ni descarga. */
const ALL_STAGES = [
  "FETCHING_METADATA",
  "DOWNLOADING",
  "EXTRACTING_AUDIO",
  "TRANSCRIBING",
  "SUMMARIZING",
] as const;

export function stagesFor(item: MediaItem): readonly string[] {
  return item.sourceType === "YOUTUBE" ? ALL_STAGES : ALL_STAGES.slice(2);
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelative(iso: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}
