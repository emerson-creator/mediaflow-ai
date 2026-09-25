import type { MediaItem, ProgressEvent } from "../types";

interface Props {
  items: MediaItem[];
  progressByMediaId: Record<string, ProgressEvent>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_UPLOAD: "bg-gray-100 text-gray-700",
  UPLOADED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export function MediaList({ items, progressByMediaId }: Props) {
  if (items.length === 0) {
    return <p className="text-gray-500 text-sm">No files uploaded yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        // Live progress overrides the last known DB status, when available
        const live = progressByMediaId[item.id];
        const displayStatus = live?.stage ?? item.status;
        const progress = live?.progress ?? (item.status === "DONE" ? 100 : 0);

        return (
          <li key={item.id} className="border rounded-lg p-4 bg-white">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1 truncate font-medium text-sm">
                {item.filename}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs ${STATUS_COLORS[displayStatus] ?? STATUS_COLORS.PENDING_UPLOAD}`}
              >
                {displayStatus}
              </span>
            </div>

            {displayStatus !== "DONE" && displayStatus !== "FAILED" && (
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {live?.message && displayStatus === "FAILED" && (
              <p className="mt-2 break-words text-xs text-red-600">
                {live.message}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
