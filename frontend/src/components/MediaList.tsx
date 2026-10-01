import type { MediaItem, ProgressEvent } from "../types";

interface Props {
  items: MediaItem[];
  progressByMediaId: Record<string, ProgressEvent>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_UPLOAD: "bg-gray-100 text-gray-700",
  QUEUED: "bg-gray-100 text-gray-700",
  FETCHING_METADATA: "bg-blue-100 text-blue-700",
  UPLOADED: "bg-blue-100 text-blue-700",
  DOWNLOADING: "bg-blue-100 text-blue-700",
  EXTRACTING_AUDIO: "bg-yellow-100 text-yellow-700",
  TRANSCRIBING: "bg-yellow-100 text-yellow-700",
  SUMMARIZING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-400",
};

const STAGE_LABELS: Record<string, string> = {
  FETCHING_METADATA: "Fetching info",
  DOWNLOADING: "Downloading",
  EXTRACTING_AUDIO: "Extracting audio",
  TRANSCRIBING: "Transcribing",
  SUMMARIZING: "Summarizing",
};

export function MediaList({ items, progressByMediaId }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No files yet. Upload one or paste a YouTube URL.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const live = progressByMediaId[item.id];
        const displayStatus = live?.stage ?? item.status;
        const progress = live?.progress ?? (item.status === "DONE" ? 100 : 0);
        const isYoutube = item.sourceType === "YOUTUBE";
        const displayName = item.title || item.filename;
        const isExpired = !live && item.status === "EXPIRED";

        return (
          <li
            key={item.id}
            className="border rounded-lg p-4 bg-white flex gap-3"
          >
            {isYoutube && item.thumbnailUrl && (
              <img
                src={item.thumbnailUrl}
                alt=""
                className="w-20 h-14 object-cover rounded flex-shrink-0 bg-gray-100"
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isYoutube && (
                    <span
                      className="text-xs text-red-600 flex-shrink-0"
                      title="From YouTube"
                    >
                      ▶
                    </span>
                  )}
                  <span className="font-medium text-sm truncate">
                    {displayName}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                    STATUS_COLORS[displayStatus] ?? STATUS_COLORS.PENDING_UPLOAD
                  }`}
                >
                  {STAGE_LABELS[displayStatus] ?? displayStatus}
                </span>
              </div>

              {displayStatus !== "DONE" &&
                displayStatus !== "FAILED" &&
                !isExpired && (
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

              {live?.message && displayStatus === "FAILED" && (
                <p className="mt-1 text-xs text-red-600">{live.message}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
