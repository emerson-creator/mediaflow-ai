import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import * as mediaApi from "../api/media";
import { ActivityLog } from "../components/ActivityLog";
import { MediaList } from "../components/MediaList";
import { NewMediaDialog } from "../components/NewMediaLog";
import { UploadStatus } from "../components/UploadStatus";
import { useLive, useLiveEvents } from "../context/useLive";
import { useFileDrop } from "../hooks/useFileDrop";
import { useUpload } from "../hooks/useUpload";
import type { MediaItem } from "../types";

const FRESH_MS = 2500;

export function DashboardPage() {
  const { progressByMediaId, registerMedia } = useLive();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const searchRef = useRef<HTMLInputElement>(null);
  const knownIds = useRef<Set<string> | null>(null);
  const freshTimer = useRef<number | undefined>(undefined);

  // Aplica la lista del servidor y resalta brevemente los registros nuevos.
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

  const loadMedia = useCallback(async () => {
    setIsLoadingMedia(true);
    setMediaError(null);
    try {
      applyItems(await mediaApi.listMedia());
    } catch (error) {
      console.error("Failed to load media", error);
      setMediaError("Could not load your media files.");
    } finally {
      setIsLoadingMedia(false);
    }
  }, [applyItems]);

  useEffect(() => {
    let isCancelled = false;

    void mediaApi
      .listMedia()
      .then((data) => {
        if (!isCancelled) {
          applyItems(data);
          setMediaError(null);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error("Failed to load media", error);
          setMediaError("Could not load your media files.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingMedia(false);
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
    if (event.stage === "DONE" || event.stage === "FAILED") void loadMedia();
  });

  const uploader = useUpload(loadMedia);

  const isDragging = useFileDrop(
    (file) => void uploader.start(file),
    !isDialogOpen && !uploader.isBusy,
  );

  // Atajos: N / U abre "New media", / enfoca la búsqueda.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isDialogOpen) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "n" || e.key === "u") {
        e.preventDefault();
        setIsDialogOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDialogOpen]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Follow every file through transcription and summary.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          <Plus size={14} aria-hidden />
          New media
          <kbd className="hidden rounded border border-canvas/25 px-1 font-mono text-[11px] opacity-60 sm:inline">
            N
          </kbd>
        </button>
      </div>

      <UploadStatus
        phase={uploader.phase}
        percent={uploader.percent}
        fileName={uploader.fileName}
        error={uploader.error}
        onCancel={uploader.cancel}
        onDismissError={uploader.dismissError}
      />

      {mediaError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad"
        >
          <span>{mediaError}</span>
          <button
            type="button"
            onClick={loadMedia}
            className="underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <MediaList
          items={items}
          progressByMediaId={progressByMediaId}
          isLoading={isLoadingMedia}
          freshIds={freshIds}
          searchRef={searchRef}
          onRefresh={loadMedia}
          onNew={() => setIsDialogOpen(true)}
        />
        <ActivityLog />
      </div>

      <NewMediaDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onFile={(file) => void uploader.start(file)}
        onYoutubeQueued={loadMedia}
      />

      {isDragging && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-canvas/85 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-run px-16 py-12">
            <UploadCloud size={28} className="text-run" />
            <p className="text-sm font-medium">Drop to upload</p>
            <p className="text-xs text-ink-dim">Audio or video files</p>
          </div>
        </div>
      )}
    </main>
  );
}
