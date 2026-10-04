import { Link, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { ArrowUpRight, Library, Plus, Sparkles } from "lucide-react";
import { ActivityLog } from "../components/ActivityLog";
import { MediaList } from "../components/MediaList";
import { useLibrary } from "../context/useLibrary";
import { useLive } from "../context/useLive";

export function LibraryPage() {
  const { items, isLoading, error, freshIds, reload } = useLibrary();
  const { progressByMediaId } = useLive();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-ink-faint">
                <Library size={14} aria-hidden />
                <span>Workspace</span>
                <span>·</span>
                <span>Library</span>
              </div>

              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
                  Library
                </h1>

                {!isLoading && items.length > 0 && (
                  <span className="rounded-full border border-line bg-panel px-2.5 py-1 font-mono text-xs tabular-nums text-ink-dim">
                    {items.length}
                  </span>
                )}
              </div>

              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-dim">
                Everything processed by MediaFlow, from raw media to transcripts
                and AI-generated insights.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="group inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-canvas shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-95 lg:self-auto"
            >
              <Plus size={15} aria-hidden />

              <span>New media</span>

              <kbd className="hidden rounded border border-canvas/20 px-1.5 py-0.5 font-mono text-[10px] opacity-60 sm:inline">
                N
              </kbd>
            </Link>
          </div>

          {/* Overview */}
          {!isLoading && items.length > 0 && (
            <div className="mt-7 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-panel/70 px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Total media
                </p>

                <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                  {items.length}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-panel/70 px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Processing
                </p>

                <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                  {
                    items.filter(
                      (item) =>
                        item.status !== "DONE" && item.status !== "FAILED",
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-xl border border-line bg-panel/70 px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Completed
                </p>

                <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                  {items.filter((item) => item.status === "DONE").length}
                </p>
              </div>
            </div>
          )}
        </header>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={reload}
              className="font-medium underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main workspace */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0">
            <MediaList
              items={items}
              searchRef={searchRef}
              progressByMediaId={progressByMediaId}
              isLoading={isLoading}
              freshIds={freshIds}
              onRefresh={reload}
              onNew={() => navigate("/dashboard")}
            />
          </section>

          <aside className="min-w-0">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-2xl border border-line bg-panel/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-canvas">
                    <Sparkles size={15} className="text-ink-dim" aria-hidden />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-ink">
                      MediaFlow workspace
                    </p>

                    <p className="mt-1 text-xs leading-5 text-ink-dim">
                      Upload media, monitor processing and explore generated
                      transcripts from one place.
                    </p>
                  </div>
                </div>

                <Link
                  to="/dashboard"
                  className="mt-4 flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2.5 text-xs font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink"
                >
                  <span>Create new media</span>
                  <ArrowUpRight size={13} aria-hidden />
                </Link>
              </div>

              <ActivityLog />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
