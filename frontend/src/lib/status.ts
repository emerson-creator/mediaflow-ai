import type { MediaItem, ProgressEvent } from "../types";

export type Tone = "idle" | "run" | "ok" | "bad" | "warn" | "muted";

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
  // Estado derivado en el cliente: sin avances durante demasiado tiempo.
  STALLED: "Stalled",
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
  if (status === "STALLED") return "warn";
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

// --- Detección de trabajos atascados -------------------------------------

const STALL_AFTER_MS = 15 * 60 * 1000;
const WAITING = new Set(["PENDING_UPLOAD", "QUEUED", "UPLOADED", "PROCESSING"]);

/**
 * Un registro está "stalled" si sigue esperando en la base de datos, no ha llegado
 * ningún evento en vivo para él y lleva más de 15 minutos desde su creación.
 */
export function isStalled(
  item: Pick<MediaItem, "status" | "createdAt">,
  live?: ProgressEvent,
): boolean {
  if (live) return false;
  if (!WAITING.has(item.status)) return false;
  return Date.now() - new Date(item.createdAt).getTime() > STALL_AFTER_MS;
}

/** Estado a mostrar en la UI: incluye el derivado STALLED. */
export function displayStatus(item: MediaItem, live?: ProgressEvent): string {
  return isStalled(item, live) ? "STALLED" : resolveStatus(item, live);
}

export function stallMessage(
  item: Pick<MediaItem, "status" | "createdAt">,
): string {
  if (item.status === "PENDING_UPLOAD")
    return "The upload was never completed.";
  return `Created ${formatRelative(item.createdAt)} with no progress.`;
}

// --- Nombres -------------------------------------------------------------

/** Para YouTube sin título aún, el filename es la URL: se muestra algo legible. */
export function mediaName(
  item: Pick<MediaItem, "title" | "filename" | "sourceType">,
): string {
  if (item.title) return item.title;
  if (item.sourceType === "YOUTUBE" && /^https?:\/\//.test(item.filename)) {
    return "YouTube video";
  }
  return item.filename;
}

// --- Etapas del worker ---------------------------------------------------

/** Un archivo subido no pasa por metadata ni descarga. */
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

// --- Fechas --------------------------------------------------------------

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelative(iso: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}
