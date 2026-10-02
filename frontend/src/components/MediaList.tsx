import { useMemo, useState, type RefObject } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileAudio,
  FileVideo,
  Link2,
  Plus,
  RotateCw,
  Search,
} from "lucide-react";
import type { MediaItem, ProgressEvent } from "../types";
import { formatRelative, isActive, resolveStatus } from "../lib/status";
import { PipelineSteps } from "./PipelineSteps";
import { StatusBadge } from "./StatusBadge";

interface Props {
  items: MediaItem[];
  progressByMediaId: Record<string, ProgressEvent>;
  isLoading: boolean;
  freshIds: Set<string>;
  searchRef: RefObject<HTMLInputElement | null>;
  onRefresh: () => void;
  onNew: () => void;
}

type Filter = "all" | "active" | "done" | "failed";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "done", label: "Completed" },
  { id: "failed", label: "Failed" },
];

const RECENT_LIMIT = 5;

function matchesFilter(filter: Filter, status: string): boolean {
  if (filter === "all") return true;
  if (filter === "active") return isActive(status);
  if (filter === "done") return status === "DONE";
  return status === "FAILED";
}

function Thumb({ item }: { item: MediaItem }) {
  if (item.sourceType === "YOUTUBE" && item.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt=""
        className="h-9 w-14 shrink-0 rounded-sm bg-panel object-cover"
      />
    );
  }
  const Icon =
    item.sourceType === "YOUTUBE"
      ? Link2
      : item.mimeType?.startsWith("video/")
        ? FileVideo
        : FileAudio;
  return (
    <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-sm border border-line bg-panel text-ink-faint">
      <Icon size={16} aria-hidden />
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i} className="border-b border-line last:border-0">
          <td className="px-4 py-3">
            <div className="h-9 w-56 rounded-sm bg-hover motion-safe:animate-pulse" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-20 rounded-sm bg-hover motion-safe:animate-pulse" />
          </td>
          <td className="hidden px-4 py-3 md:table-cell">
            <div className="h-4 w-32 rounded-sm bg-hover motion-safe:animate-pulse" />
          </td>
          <td className="hidden px-4 py-3 sm:table-cell">
            <div className="h-4 w-16 rounded-sm bg-hover motion-safe:animate-pulse" />
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export function MediaList({
  items,
  progressByMediaId,
  isLoading,
  freshIds,
  searchRef,
  onRefresh,
  onNew,
}: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(
    () =>
      [...items]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map((item) => {
          const live = progressByMediaId[item.id];
          return { item, live, status: resolveStatus(item, live) };
        }),
    [items, progressByMediaId],
  );

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: rows.length,
      active: 0,
      done: 0,
      failed: 0,
    };
    for (const row of rows) {
      if (isActive(row.status)) result.active++;
      if (row.status === "DONE") result.done++;
      if (row.status === "FAILED") result.failed++;
    }
    return result;
  }, [rows]);

  const normalizedQuery = query.trim().toLowerCase();
  const visible = rows.filter(({ item, status }) => {
    if (!matchesFilter(filter, status)) return false;
    if (!normalizedQuery) return true;
    const name = (item.title || item.filename).toLowerCase();
    return (
      name.includes(normalizedQuery) || item.id.startsWith(normalizedQuery)
    );
  });

  const showSkeleton = isLoading && items.length === 0;
  const isFirstRun = !isLoading && items.length === 0;
  const displayed = showAll ? visible : visible.slice(0, RECENT_LIMIT);
  const hasHiddenItems = visible.length > RECENT_LIMIT;

  return (
    <section aria-label="Media files" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                filter === id
                  ? "bg-hover text-ink"
                  : "text-ink-dim hover:text-ink"
              }`}
            >
              {label}
              <span className="ml-1.5 font-mono text-xs tabular-nums text-ink-faint">
                {counts[id]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search"
              aria-label="Search media"
              className="w-40 rounded-md border border-line bg-panel py-1.5 pl-8 pr-8 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none sm:w-56"
            />
            {!query && (
              <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line px-1 font-mono text-[11px] text-ink-faint">
                /
              </kbd>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh list"
            className="rounded-md border border-line p-2 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          >
            <RotateCw
              size={14}
              className={isLoading ? "motion-safe:animate-spin" : ""}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-panel">
        {!isFirstRun && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-xs text-ink-faint">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                  Pipeline
                </th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Created
                </th>
                <th className="w-10">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {showSkeleton && <SkeletonRows />}

              {displayed.map(({ item, live, status }) => {
                const displayName = item.title || item.filename;
                const progress =
                  live?.progress ?? (item.status === "DONE" ? 100 : undefined);
                return (
                  <tr
                    key={item.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("a,button")) return;
                      navigate(`/media/${item.id}`);
                    }}
                    className={`cursor-pointer border-b border-line transition-colors duration-1000 last:border-0 hover:bg-hover hover:duration-150 ${
                      freshIds.has(item.id) ? "bg-run/10" : ""
                    }`}
                  >
                    <td className="max-w-xs px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb item={item} />
                        <div className="min-w-0">
                          <Link
                            to={`/media/${item.id}`}
                            className="block truncate text-sm font-medium hover:underline hover:underline-offset-2"
                          >
                            {displayName}
                          </Link>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-faint">
                            <span>
                              {item.sourceType === "YOUTUBE"
                                ? "YouTube"
                                : "Upload"}
                            </span>
                            <span className="font-mono">
                              {item.id.slice(0, 8)}
                            </span>
                          </p>
                          {status === "FAILED" && (
                            <p className="mt-1 text-xs text-bad">
                              {live?.message ?? "Processing failed."}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusBadge status={status} />
                    </td>
                    <td className="hidden px-4 py-3 align-middle md:table-cell">
                      <PipelineSteps
                        item={item}
                        status={status}
                        progress={progress}
                      />
                    </td>
                    <td
                      className="hidden px-4 py-3 align-middle text-sm text-ink-dim sm:table-cell"
                      title={new Date(item.createdAt).toLocaleString()}
                    >
                      {formatRelative(item.createdAt)}
                    </td>
                    <td className="pr-4 text-right align-middle text-ink-faint">
                      <ChevronRight size={14} aria-hidden />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!showSkeleton && !isFirstRun && hasHiddenItems && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line px-4 py-2.5 text-xs font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          >
            {showAll ? (
              <ChevronUp size={14} aria-hidden />
            ) : (
              <ChevronDown size={14} aria-hidden />
            )}
            {showAll ? "Show recent" : `View all ${visible.length}`}
          </button>
        )}

        {isFirstRun && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium">No media yet</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-dim">
              Drop a file anywhere on this page, or add one to see it move
              through the pipeline.
            </p>
            <button
              type="button"
              onClick={onNew}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
            >
              <Plus size={14} aria-hidden />
              New media
            </button>
          </div>
        )}

        {!showSkeleton && !isFirstRun && visible.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">Nothing matches</p>
            <p className="mt-1 text-sm text-ink-dim">
              Try a different search or filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
              className="mt-3 text-sm underline underline-offset-2"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
