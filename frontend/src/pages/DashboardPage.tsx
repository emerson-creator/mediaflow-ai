import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, ChevronRight, UploadCloud, Waves } from "lucide-react";
import { Composer } from "../components/Composer";
import { PipelineSteps } from "../components/PipelineSteps";
//import { UploadStatus } from "../components/UploadStatus";
import { useLibrary } from "../context/useLibrary";
import { useLive } from "../context/useLive";
import { useFileDrop } from "../hooks/useFileDrop";
import {
  STATUS_LABELS,
  isActive,
  isStalled,
  resolveStatus,
} from "../lib/status";

const MAX_PROCESSING_ROWS = 5;

export function DashboardPage() {
  const { items, upload, reload } = useLibrary();
  const { progressByMediaId } = useLive();

  const isDragging = useFileDrop(
    (file) => void upload.start(file),
    !upload.isBusy,
  );

  const processing = useMemo(
    () =>
      items
        .map((item) => {
          const live = progressByMediaId[item.id];

          return {
            item,
            live,
            status: resolveStatus(item, live),
          };
        })
        .filter(
          ({ item, live, status }) =>
            isActive(status) && !isStalled(item, live),
        )
        .sort(
          (a, b) =>
            new Date(b.item.createdAt).getTime() -
            new Date(a.item.createdAt).getTime(),
        )
        .slice(0, MAX_PROCESSING_ROWS),
    [items, progressByMediaId],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      {/* Background atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-240px] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-run/[0.035] blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-full max-w-6xl -translate-x-1/2 bg-gradient-to-r from-transparent via-line to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-8">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 text-xs text-ink-dim backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-run" />
              Processing pipeline online
            </span>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-20 text-center sm:pt-28">
          <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-line bg-panel/80 px-3 py-1.5 text-xs font-medium text-ink-dim shadow-sm backdrop-blur">
            <Waves size={13} aria-hidden />
            <span>Media intelligence workspace</span>
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
            M e d i a<span className="text-ink-dim"> F l o w</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-ink-dim sm:text-[15px]">
            Drop an audio or video file, or paste a YouTube link. MediaFlow
            handles transcription, summarization and keyword extraction for you.
          </p>

          {/* Composer */}
          <div className="mt-10">
            <Composer upload={upload} onQueued={reload} />
          </div>

          {/* Trust / capabilities */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-faint">
            <span>Audio & video</span>
            <span className="hidden h-1 w-1 rounded-full bg-ink-faint sm:block" />
            <span>YouTube</span>
            <span className="hidden h-1 w-1 rounded-full bg-ink-faint sm:block" />
            <span>Live progress</span>
          </div>
        </section>

        {/* Processing */}
        {processing.length > 0 && (
          <section
            className="mx-auto mt-20 max-w-4xl"
            aria-label="Processing now"
          >
            <div className="mb-4 flex items-end justify-between px-1">
              <div>
                <div className="flex items-center gap-2">
                  <Activity size={15} className="text-run" aria-hidden />
                  <h2 className="text-sm font-semibold text-ink">
                    Processing now
                  </h2>
                </div>

                <p className="mt-1 text-xs text-ink-faint">
                  Live jobs moving through the pipeline
                </p>
              </div>

              <span className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-medium text-ink-dim">
                {processing.length} {processing.length === 1 ? "job" : "jobs"}
              </span>
            </div>

            <ul className="overflow-hidden rounded-2xl border border-line bg-panel/75 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm">
              {processing.map(({ item, live, status }, index) => (
                <li
                  key={item.id}
                  className={index > 0 ? "border-t border-line" : undefined}
                >
                  <Link
                    to={`/media/${item.id}`}
                    className="group flex min-h-[72px] items-center gap-4 px-4 py-4 transition-colors hover:bg-hover sm:px-5"
                  >
                    {/* Status marker */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-canvas">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-run" />
                    </div>

                    {/* Main content */}
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-ink">
                        {item.title || item.filename}
                      </p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-ink-dim">
                          {STATUS_LABELS[status] ?? status}
                        </span>

                        {live?.progress !== undefined && (
                          <>
                            <span className="text-ink-faint">·</span>
                            <span className="text-xs tabular-nums text-ink-faint">
                              {Math.round(live.progress)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Pipeline */}
                    <div className="hidden md:block">
                      <PipelineSteps
                        item={item}
                        status={status}
                        progress={live?.progress}
                      />
                    </div>

                    <ChevronRight
                      size={16}
                      className="shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink-dim"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Drag overlay */}
      {isDragging && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-6 backdrop-blur-md"
        >
          <div className="absolute inset-4 rounded-3xl border border-dashed border-run/50 sm:inset-8" />

          <div className="relative flex w-full max-w-md flex-col items-center rounded-3xl border border-line bg-panel px-8 py-12 text-center shadow-2xl">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-run/20 bg-run/10">
              <UploadCloud size={26} className="text-run" />
            </div>

            <p className="text-base font-semibold text-ink">
              Drop your media here
            </p>

            <p className="mt-2 text-sm text-ink-dim">
              Release to start the processing pipeline
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs text-ink-faint">
              <span>Audio</span>
              <span>·</span>
              <span>Video</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
