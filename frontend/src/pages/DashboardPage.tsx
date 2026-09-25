import { useCallback, useEffect, useState } from "react";
import * as mediaApi from "../api/media";
import { MediaList } from "../components/MediaList";
import { UploadForm } from "../components/UploadForm";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../hooks/useSocket";
import type { MediaItem, ProgressEvent } from "../types";

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [progressByMediaId, setProgressByMediaId] = useState<
    Record<string, ProgressEvent>
  >({});
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const loadMedia = useCallback(async () => {
    setIsLoadingMedia(true);
    setMediaError(null);
    try {
      const data = await mediaApi.listMedia();
      setItems(data);
    } catch (error) {
      console.error("Failed to load media", error);
      setMediaError("Could not load your media files.");
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void mediaApi
      .listMedia()
      .then((data) => {
        if (!isCancelled) {
          setItems(data);
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
    };
  }, []);

  const handleProgress = useCallback(
    (event: ProgressEvent) => {
      setProgressByMediaId((prev) => ({ ...prev, [event.mediaId]: event }));

      // Once a pipeline finishes (success or failure), refresh from the DB
      // to get the final persisted state, instead of trusting socket state forever.
      if (event.stage === "DONE" || event.stage === "FAILED") {
        loadMedia();
      }
    },
    [loadMedia],
  );

  const { isConnected } = useSocket(handleProgress);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">MediaFlow AI</h1>
          <p className="text-xs text-gray-500">
            {user?.email} · {isConnected ? "🟢 Live" : "🔴 Disconnected"}
          </p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-2xl mx-auto py-8 px-6">
        <UploadForm onUploaded={loadMedia} />
        {isLoadingMedia && (
          <p className="text-sm text-gray-500">Loading your media files...</p>
        )}
        {mediaError && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{mediaError}</span>
            <button type="button" onClick={loadMedia} className="underline">
              Retry
            </button>
          </div>
        )}
        {!isLoadingMedia && !mediaError && (
          <MediaList items={items} progressByMediaId={progressByMediaId} />
        )}
      </main>
    </div>
  );
}
