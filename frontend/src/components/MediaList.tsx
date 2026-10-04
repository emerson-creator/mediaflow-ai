import { useMemo, useState, type RefObject } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileAudio,
  FileVideo,
  FolderOpen,
  Link2,
  Plus,
  RotateCw,
  Search,
  SlidersHorizontal,
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

const RECENT_LIMIT = 7;

function matchesFilter(filter: Filter, status: string): boolean {
  if (filter === "all") return true;
  if (filter === "active") return isActive(status);
  if (filter === "done") return status === "DONE";
  return status === "FAILED";
}

function Thumb({ item }: { item: MediaItem }) {
  if (item.sourceType === "YOUTUBE" && item.thumbnailUrl) {
    return (
      <div className="relative h-10 w-[4.25rem] shrink-0 overflow-hidden rounded-lg border border-line bg-panel">
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
    );
  }

  const Icon =
    item.sourceType === "YOUTUBE"
      ? Link2
      : item.mimeType?.startsWith("video/")
        ? FileVideo
        : FileAudio;

  return (
    <span className="flex h-10 w-[4.25rem] shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink-faint">
      <Icon size={17} aria-hidden />
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <tr key={i} className="border-b border-line last:border-0">
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-[4.25rem] rounded-lg bg-hover motion-safe:animate-pulse" />

              <div className="space-y-2">
                <div className="h-3.5 w-52 rounded bg-hover motion-safe:animate-pulse" />
                <div className="h-3 w-20 rounded bg-hover motion-safe:animate-pulse" />
              </div>
            </div>
          </td>

          <td className="px-4 py-4">
            <div className="h-6 w-20 rounded-full bg-hover motion-safe:animate-pulse" />
          </td>

          <td className="hidden px-4 py-4 md:table-cell">
            <div className="h-4 w-36 rounded bg-hover motion-safe:animate-pulse" />
          </td>

          <td className="hidden px-4 py-4 sm:table-cell">
            <div className="h-4 w-16 rounded bg-hover motion-safe:animate-pulse" />
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

          return {
            item,
            live,
            status: resolveStatus(item, live),
          };
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
      if (isActive(row.status)) result.active += 1;
      if (row.status === "DONE") result.done += 1;
      if (row.status === "FAILED") result.failed += 1;
    }

    return result;
  }, [rows]);

  const normalizedQuery = query.trim().toLowerCase();

  const visible = rows.filter(({ item, status }) => {
    if (!matchesFilter(filter, status)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

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
      {/* Toolbar */}
      <div className="mb-3 rounded-2xl border border-line bg-panel/70 p-2">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          {/* Filters */}
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {FILTERS.map(({ id, label }) => {
              const active = filter === id;

              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "bg-canvas text-ink shadow-sm"
                      : "text-ink-dim hover:bg-hover hover:text-ink"
                  }`}
                >
                  {label}

                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      active ? "text-ink-dim" : "text-ink-faint"
                    }`}
                  >
                    {counts[id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + actions */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:flex-none">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
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
                placeholder="Search media..."
                aria-label="Search media"
                className="h-9 w-full rounded-lg border border-line bg-canvas pl-8 pr-9 text-xs text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-line-strong lg:w-52"
              />

              {!query ? (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                  /
                </kbd>
              ) : (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-faint transition-colors hover:text-ink"
                  aria-label="Clear search"
                >
                  Esc
                </button>
              )}
            </div>

            <button
              type="button"
              className="hidden h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-xs font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink sm:inline-flex"
            >
              <SlidersHorizontal size={13} aria-hidden />
              <span>Filter</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh list"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink-dim transition-colors hover:bg-hover hover:text-ink"
            >
              <RotateCw
                size={14}
                className={isLoading ? "motion-safe:animate-spin" : ""}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
        {!isFirstRun && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line bg-canvas/40 text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                  <th className="px-4 py-3 font-medium">Media</th>

                  <th className="px-4 py-3 font-medium">Status</th>

                  <th className="px-4 py-3 font-medium">Pipeline</th>

                  <th className="px-4 py-3 font-medium">Created</th>

                  <th className="w-10">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {showSkeleton && <SkeletonRows />}

                {!showSkeleton &&
                  displayed.map(({ item, live, status }) => {
                    const displayName = item.title || item.filename;

                    const progress =
                      live?.progress ??
                      (item.status === "DONE" ? 100 : undefined);

                    const isFresh = freshIds.has(item.id);

                    return (
                      <tr
                        key={item.id}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("a,button")) {
                            return;
                          }

                          navigate(`/media/${item.id}`);
                        }}
                        className={`group cursor-pointer border-b border-line last:border-0 transition-colors ${
                          isFresh ? "bg-run/[0.07]" : "bg-transparent"
                        } hover:bg-hover`}
                      >
                        {/* Media */}
                        <td className="max-w-[26rem] px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Thumb item={item} />

                            <div className="min-w-0">
                              <Link
                                to={`/media/${item.id}`}
                                className="block truncate text-sm font-medium text-ink transition-colors hover:text-ink-dim"
                              >
                                {displayName}
                              </Link>

                              <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-faint">
                                <span>
                                  {item.sourceType === "YOUTUBE"
                                    ? "YouTube"
                                    : item.mimeType?.startsWith("video/")
                                      ? "Video"
                                      : "Audio"}
                                </span>

                                <span>·</span>

                                <span className="font-mono">
                                  {item.id.slice(0, 8)}
                                </span>
                              </div>

                              {status === "FAILED" && (
                                <p className="mt-1 truncate text-xs text-bad">
                                  {live?.message ?? "Processing failed."}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 align-middle">
                          <StatusBadge status={status} />
                        </td>

                        {/* Pipeline */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex min-w-[190px] items-center">
                            <PipelineSteps
                              item={item}
                              status={status}
                              progress={progress}
                            />
                          </div>
                        </td>

                        {/* Created */}
                        <td
                          className="px-4 py-3.5 align-middle text-xs text-ink-dim"
                          title={new Date(item.createdAt).toLocaleString()}
                        >
                          {formatRelative(item.createdAt)}
                        </td>

                        {/* Arrow */}
                        <td className="pr-4 text-right align-middle">
                          <ChevronRight
                            size={15}
                            className="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink-dim"
                            aria-hidden
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Show all / recent */}
        {!showSkeleton && !isFirstRun && hasHiddenItems && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line px-4 py-3 text-xs font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink"
          >
            {showAll ? (
              <ChevronUp size={14} aria-hidden />
            ) : (
              <ChevronDown size={14} aria-hidden />
            )}

            {showAll ? "Show recent" : `View all ${visible.length}`}
          </button>
        )}

        {/* First run */}
        {isFirstRun && (
          <div className="flex min-h-[22rem] flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-canvas">
              <FolderOpen size={20} className="text-ink-faint" aria-hidden />
            </div>

            <p className="mt-5 text-sm font-semibold text-ink">
              Your library is empty
            </p>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-dim">
              Upload a file or paste a YouTube link and your first processed
              media will appear here.
            </p>

            <button
              type="button"
              onClick={onNew}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition-all hover:-translate-y-0.5 hover:opacity-95"
            >
              <Plus size={15} aria-hidden />
              Create first media
            </button>
          </div>
        )}

        {/* Empty filter state */}
        {!showSkeleton && !isFirstRun && visible.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-canvas">
              <Search size={16} className="text-ink-faint" aria-hidden />
            </div>

            <p className="mt-4 text-sm font-semibold text-ink">
              Nothing matches
            </p>

            <p className="mt-1 text-sm text-ink-dim">
              Try another search query or choose a different filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
              className="mt-4 text-xs font-medium text-ink underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
