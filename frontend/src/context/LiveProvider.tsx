import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import type { MediaItem, ProgressEvent } from "../types";
import {
  LiveContext,
  type ActivityEntry,
  type LiveState,
  type Toast,
} from "./live-context";

const MAX_ACTIVITY = 40;
const MAX_TOASTS = 10;

export function LiveProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  const [progressByMediaId, setProgressByMediaId] = useState<
    Record<string, ProgressEvent>
  >({});
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});

  const listeners = useRef(new Set<(event: ProgressEvent) => void>());
  const seq = useRef(0);

  useEffect(() => {
    pathRef.current = location.pathname;
  });

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => setToasts([]), []);

  // Las tarjetas no caducan: se quedan hasta que el usuario las cierra o abre el resultado.
  // Un resultado nuevo del mismo media reemplaza al anterior.
  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${++seq.current}`;
    setToasts((prev) =>
      [
        ...prev.filter((t) => t.mediaId !== toast.mediaId),
        { ...toast, id },
      ].slice(-MAX_TOASTS),
    );
  }, []);

  // Estable a propósito: useSocket no re-suscribe cuando cambia el callback.
  const handleProgress = useCallback(
    (event: ProgressEvent) => {
      setProgressByMediaId((prev) => ({ ...prev, [event.mediaId]: event }));

      const entry: ActivityEntry = {
        id: `activity-${++seq.current}`,
        mediaId: event.mediaId,
        stage: event.stage,
        progress: event.progress,
        message: event.message,
        at: event.occurredAt,
      };
      setActivity((prev) => {
        const [head, ...rest] = prev;
        // Eventos consecutivos de la misma etapa se funden en una sola línea.
        if (
          head &&
          head.mediaId === entry.mediaId &&
          head.stage === entry.stage
        ) {
          return [entry, ...rest];
        }
        return [entry, ...prev].slice(0, MAX_ACTIVITY);
      });

      const isTerminal = event.stage === "DONE" || event.stage === "FAILED";
      if (isTerminal && pathRef.current !== `/media/${event.mediaId}`) {
        pushToast({
          mediaId: event.mediaId,
          tone: event.stage === "DONE" ? "ok" : "bad",
          message:
            event.stage === "DONE"
              ? "Transcript and summary are ready."
              : (event.message ?? "Processing failed."),
        });
      }

      listeners.current.forEach((listener) => listener(event));
    },
    [pushToast],
  );

  const { isConnected } = useSocket(handleProgress);

  const registerMedia = useCallback(
    (items: Pick<MediaItem, "id" | "title" | "filename">[]) => {
      setTitles((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const item of items) {
          const name = item.title || item.filename;
          if (next[item.id] !== name) {
            next[item.id] = name;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [],
  );

  const subscribe = useCallback((listener: (event: ProgressEvent) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo<LiveState>(
    () => ({
      isConnected,
      progressByMediaId,
      activity,
      toasts,
      titles,
      dismissToast,
      clearToasts,
      registerMedia,
      subscribe,
    }),
    [
      isConnected,
      progressByMediaId,
      activity,
      toasts,
      titles,
      dismissToast,
      clearToasts,
      registerMedia,
      subscribe,
    ],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
