import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useLive } from "../context/useLive";

export function ToastViewport() {
  const { toasts, titles, dismissToast } = useLive();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-panel p-3 shadow-lg shadow-black/40"
        >
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              toast.tone === "ok" ? "bg-ok" : "bg-bad"
            }`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {titles[toast.mediaId] ?? "Media file"}
            </p>
            <p className="mt-0.5 text-xs text-ink-dim">{toast.message}</p>
            {toast.tone === "ok" && (
              <Link
                to={`/media/${toast.mediaId}`}
                onClick={() => dismissToast(toast.id)}
                className="mt-1.5 inline-block text-xs underline underline-offset-2"
              >
                View result
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
