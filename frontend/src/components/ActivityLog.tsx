import { Link } from "react-router-dom";
import { useLive } from "../context/useLive";
import { StatusBadge } from "./StatusBadge";

const timeFormat: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

export function ActivityLog() {
  const { activity, titles, isConnected } = useLive();

  return (
    <aside aria-label="Activity" className="hidden lg:block">
      <div className="sticky top-20 overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-medium">Activity</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? "bg-ok" : "bg-bad"
              }`}
              aria-hidden
            />
            {isConnected ? "Streaming" : "Offline"}
          </span>
        </div>

        {activity.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs leading-relaxed text-ink-faint">
            Pipeline events show up here
            <br />
            while your files are processed.
          </p>
        ) : (
          <ol className="max-h-[calc(100vh-12rem)] divide-y divide-line overflow-y-auto">
            {activity.map((entry) => {
              const isRunning =
                entry.stage !== "DONE" && entry.stage !== "FAILED";
              return (
                <li key={entry.id}>
                  <Link
                    to={`/media/${entry.mediaId}`}
                    className="block px-4 py-2.5 transition-colors hover:bg-hover"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm">
                        {titles[entry.mediaId] ??
                          `Media ${entry.mediaId.slice(0, 8)}`}
                      </span>
                      <time
                        dateTime={entry.at}
                        className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint"
                      >
                        {new Date(entry.at).toLocaleTimeString([], timeFormat)}
                      </time>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                      <StatusBadge status={entry.stage} />
                      {isRunning && (
                        <span className="font-mono tabular-nums text-ink-faint">
                          {Math.round(entry.progress)}%
                        </span>
                      )}
                    </div>
                    {entry.stage === "FAILED" && entry.message && (
                      <p className="mt-1 text-xs text-bad">{entry.message}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
