import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileAudio, FileVideo, X } from "lucide-react";
import * as mediaApi from "../api/media";
import type { Toast } from "../context/live-context";
import { useLive } from "../context/useLive";
import type { MediaDetails } from "../types";

const VISIBLE = 3;

/**
 * Tarjetas de resultado: aparecen cuando un pipeline termina y se quedan
 * hasta que el usuario las cierra o abre el resultado.
 */
export function ToastViewport() {
  const { toasts, dismissToast, clearToasts } = useLive();
  const { pathname } = useLocation();

  // Si ya estás viendo ese resultado, la tarjeta sobra.
  useEffect(() => {
    for (const toast of toasts) {
      if (pathname === `/media/${toast.mediaId}`) dismissToast(toast.id);
    }
  }, [pathname, toasts, dismissToast]);

  const visible = toasts.slice(-VISIBLE);
  const hiddenCount = toasts.length - visible.length;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3"
    >
      {visible.map((toast) => (
        <ResultCard
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}

      {toasts.length > 1 && (
        <div className="pointer-events-auto flex items-center justify-between rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink-dim">
          <span>
            {hiddenCount > 0
              ? `+${hiddenCount} more`
              : `${toasts.length} notifications`}
          </span>
          <button
            type="button"
            onClick={clearToasts}
            className="underline underline-offset-2 transition-colors hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const { titles } = useLive();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [shown, setShown] = useState(false);

  const isOk = toast.tone === "ok";

  // Entrada suave (se desactiva con prefers-reduced-motion vía motion-reduce).
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Una sola petición para enriquecer la tarjeta con miniatura, resumen y keywords.
  useEffect(() => {
    if (!isOk) return;
    let cancelled = false;
    mediaApi
      .getMediaDetails(toast.mediaId)
      .then((result) => {
        if (!cancelled) setDetails(result);
      })
      .catch(() => {
        /* la tarjeta funciona igual sin el resumen */
      });
    return () => {
      cancelled = true;
    };
  }, [isOk, toast.mediaId]);

  const media = details?.media;
  const transcription = details?.transcription ?? null;
  const title = titles[toast.mediaId] ?? "Media file";
  const keywords = transcription?.keywords.slice(0, 3) ?? [];
  const Icon = media?.mimeType?.startsWith("video/") ? FileVideo : FileAudio;

  return (
    <div
      className={`pointer-events-auto rounded-xl border border-line-strong bg-panel p-4 shadow-xl shadow-black/50 transition duration-200 motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-hover text-ink-faint">
          {media?.thumbnailUrl ? (
            <img
              src={media.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : media ? (
            <Icon size={16} aria-hidden />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`inline-flex items-center gap-1.5 text-xs ${
              isOk ? "text-ok" : "text-bad"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isOk ? "bg-ok" : "bg-bad"}`}
              aria-hidden
            />
            {isOk ? "Ready" : "Failed"}
          </p>
          <p className="mt-1 truncate text-sm font-medium">{title}</p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="text-ink-faint transition-colors hover:text-ink"
        >
          <X size={14} aria-hidden />
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-dim">
        {transcription?.summary ?? toast.message}
      </p>

      {keywords.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <li
              key={keyword}
              className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-dim"
            >
              {keyword}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Link
          to={`/media/${toast.mediaId}`}
          onClick={onDismiss}
          className="inline-flex items-center rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-canvas transition-opacity hover:opacity-90"
        >
          {isOk ? "View result" : "View details"}
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-3 py-1.5 text-xs text-ink-dim transition-colors hover:text-ink"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
