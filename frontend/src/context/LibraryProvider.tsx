import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as mediaApi from "../api/media";
import { useUpload } from "../hooks/useUpload";
import type { MediaItem } from "../types";
import { LibraryContext, type LibraryState } from "./library-context";
import { useLive, useLiveEvents } from "./useLive";

const FRESH_MS = 2500;

/** Carga la biblioteca una sola vez y la comparten sidebar, Home, Library y detalle. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const { registerMedia } = useLive();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const knownIds = useRef<Set<string> | null>(null);
  const freshTimer = useRef<number | undefined>(undefined);

  const applyItems = useCallback((data: MediaItem[]) => {
    const known = knownIds.current;
    if (known) {
      const added = data.filter((item) => !known.has(item.id));
      if (added.length > 0) {
        setFreshIds(new Set(added.map((item) => item.id)));
        window.clearTimeout(freshTimer.current);
        freshTimer.current = window.setTimeout(
          () => setFreshIds(new Set()),
          FRESH_MS,
        );
      }
    }
    knownIds.current = new Set(data.map((item) => item.id));
    setItems(data);
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      applyItems(await mediaApi.listMedia());
    } catch (err) {
      console.error("Failed to load media", err);
      setError("Could not load your media files.");
    } finally {
      setIsLoading(false);
    }
  }, [applyItems]);

  useEffect(() => {
    let isCancelled = false;

    void mediaApi
      .listMedia()
      .then((data) => {
        if (!isCancelled) {
          applyItems(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("Failed to load media", err);
          setError("Could not load your media files.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      window.clearTimeout(freshTimer.current);
    };
  }, [applyItems]);

  // Nombres legibles para toasts y log de actividad.
  useEffect(() => {
    registerMedia(items);
  }, [items, registerMedia]);

  // Al terminar un pipeline (éxito o fallo) se recarga el estado persistido.
  useLiveEvents((event) => {
    if (event.stage === "DONE" || event.stage === "FAILED") void reload();
  });

  const upload = useUpload(reload);

  const value = useMemo<LibraryState>(
    () => ({ items, isLoading, error, freshIds, reload, upload }),
    [items, isLoading, error, freshIds, reload, upload],
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}
