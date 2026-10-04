import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  PlayCircle,
  Sparkles,
} from "lucide-react";

import * as mediaApi from "../api/media";
import { PipelineSteps } from "../components/PipelineSteps";
import { StatusBadge } from "../components/StatusBadge";
import { TranscriptPanel } from "../components/TranscriptPanel";
import {
  YouTubePlayer,
  type YouTubeControls,
} from "../components/YoutubePlayer";
import { useLive, useLiveEvents } from "../context/useLive";
import { resolveStatus } from "../lib/status";
import { extractYouTubeId } from "../lib/youtube";
import {
  downloadText,
  formatBytes,
  formatClock,
  safeFileName,
  toSrt,
} from "../lib/transcript";
import type { MediaDetails, PlaybackInfo } from "../types";

type LoadError = "notfound" | "failed" | null;

const ghostButton =
  "inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-dim transition-colors hover:border-line-strong hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

const metaItem = "rounded-lg border border-line bg-panel/70 px-3 py-2";

export function MediaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { progressByMediaId, registerMedia } = useLive();
  const live = id ? progressByMediaId[id] : undefined;

  const [data, setData] = useState<MediaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadError>(null);

  const [playback, setPlayback] = useState<PlaybackInfo | null>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const playerRef = useRef<HTMLMediaElement | null>(null);
  const hasRetriedPlayback = useRef(false);
  const ytControls = useRef<YouTubeControls | null>(null);
  const [isYtReady, setIsYtReady] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;

    try {
      const result = await mediaApi.getMediaDetails(id);

      setData(result);
      registerMedia([result.media]);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        isAxiosError(err) && err.response?.status === 404
          ? "notfound"
          : "failed",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, registerMedia]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) void load();
    });

    return () => {
      cancelled = true;
    };
  }, [load]);

  useLiveEvents((event) => {
    if (event.mediaId !== id) return;

    if (event.stage === "DONE" || event.stage === "FAILED") {
      void load();
    }
  });

  const isDone = data?.media.status === "DONE";

  const videoId = useMemo(
    () =>
      data?.media.sourceType === "YOUTUBE" && data.media.sourceUrl
        ? extractYouTubeId(data.media.sourceUrl)
        : null,
    [data],
  );

  const loadPlayback = useCallback(async () => {
    if (!id) return;

    try {
      setPlayback(await mediaApi.getPlayback(id));
      setPlaybackFailed(false);
    } catch (err) {
      console.error("Failed to load playback URL", err);
      setPlaybackFailed(true);
    }
  }, [id]);

  useEffect(() => {
    if (!isDone || videoId) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) void loadPlayback();
    });

    return () => {
      cancelled = true;
    };
  }, [isDone, videoId, loadPlayback]);

  const transcription = data?.transcription ?? null;

  const segments = useMemo(
    () => transcription?.segments ?? [],
    [transcription],
  );

  const activeIndex = useMemo(() => {
    let idx = -1;

    for (let i = 0; i < segments.length; i++) {
      if (segments[i].start <= currentTime) {
        idx = i;
      } else {
        break;
      }
    }

    if (
      idx === segments.length - 1 &&
      idx >= 0 &&
      currentTime > segments[idx].end + 0.5
    ) {
      return -1;
    }

    return idx;
  }, [segments, currentTime]);

  function seekTo(seconds: number) {
    if (videoId) {
      ytControls.current?.seekTo(seconds);
      return;
    }

    const player = playerRef.current;

    if (!player) return;

    player.currentTime = seconds;

    player.play().catch(() => {
      // El navegador puede bloquear play(); el salto ya se hizo.
    });
  }

  function handlePlayerError() {
    if (hasRetriedPlayback.current) {
      setPlaybackFailed(true);
      return;
    }

    hasRetriedPlayback.current = true;
    void loadPlayback();
  }

  async function copyTranscript() {
    if (!transcription) return;

    try {
      await navigator.clipboard.writeText(transcription.transcript);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }

  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <div className="space-y-8" aria-busy="true">
        <div className="space-y-3">
          <div className="h-8 w-80 rounded-lg bg-hover motion-safe:animate-pulse" />
          <div className="h-4 w-[28rem] max-w-full rounded bg-hover motion-safe:animate-pulse" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="aspect-video rounded-2xl border border-line bg-hover motion-safe:animate-pulse" />
          <div className="h-[32rem] rounded-2xl border border-line bg-hover motion-safe:animate-pulse" />
        </div>
      </div>
    );
  } else if (loadError === "notfound") {
    body = (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-panel">
            <FileText size={20} className="text-ink-faint" />
          </div>

          <p className="mt-5 text-sm font-semibold text-ink">Media not found</p>

          <p className="mt-2 text-sm leading-6 text-ink-dim">
            It may have been removed, or it belongs to another account.
          </p>
        </div>
      </div>
    );
  } else if (loadError === "failed" || !data) {
    body = (
      <div
        role="alert"
        className="flex items-center justify-between gap-4 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad"
      >
        <span>Could not load this media.</span>

        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            void load();
          }}
          className="font-medium underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    );
  } else {
    const { media } = data;
    const status = resolveStatus(media, live);
    const title = media.title || media.filename;

    const timeToResult = transcription
      ? (new Date(transcription.createdAt).getTime() -
          new Date(media.createdAt).getTime()) /
        1000
      : null;

    const isVideo = playback?.mimeType.startsWith("video/") ?? false;

    body = (
      <>
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
                  {title}
                </h1>

                <StatusBadge status={status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-dim">
                <span>
                  {media.sourceType === "YOUTUBE"
                    ? "YouTube source"
                    : "Uploaded media"}
                </span>

                <span className="text-ink-faint">·</span>

                <span>{formatBytes(media.sizeBytes)}</span>

                <span className="text-ink-faint">·</span>

                <span>{new Date(media.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {media.sourceType === "YOUTUBE" && media.sourceUrl && (
              <a
                href={media.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-medium text-ink-dim transition-colors hover:border-line-strong hover:bg-hover hover:text-ink"
              >
                Open source
                <ExternalLink size={13} aria-hidden />
              </a>
            )}
          </div>

          {/* Metadata row */}
          <dl className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className={metaItem}>
              <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                Source
              </dt>

              <dd className="mt-1.5 text-sm font-medium text-ink">
                {media.sourceType === "YOUTUBE" ? "YouTube" : "File upload"}
              </dd>
            </div>

            <div className={metaItem}>
              <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                File size
              </dt>

              <dd className="mt-1.5 font-mono text-sm text-ink">
                {formatBytes(media.sizeBytes)}
              </dd>
            </div>

            {timeToResult !== null && timeToResult >= 0 ? (
              <div className={metaItem}>
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  <Clock3 size={11} aria-hidden />
                  Time to result
                </dt>

                <dd className="mt-1.5 font-mono text-sm text-ink">
                  {timeToResult.toFixed(1)} s
                </dd>
              </div>
            ) : (
              <div className={metaItem}>
                <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Media ID
                </dt>

                <dd className="mt-1.5 font-mono text-sm text-ink">
                  {media.id.slice(0, 8)}
                </dd>
              </div>
            )}

            <div className={metaItem}>
              <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                Status
              </dt>

              <dd className="mt-1.5 text-sm font-medium text-ink">{status}</dd>
            </div>
          </dl>
        </header>

        {/* Processing state */}
        {!isDone ? (
          <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-7">
            {status === "FAILED" ? (
              <div className="max-w-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-bad/20 bg-bad/10">
                  <span className="h-2.5 w-2.5 rounded-full bg-bad" />
                </div>

                <p className="mt-5 text-sm font-semibold text-bad">
                  Processing failed
                </p>

                <p className="mt-2 text-sm leading-6 text-ink-dim">
                  {live?.message ??
                    "This file could not be processed. Try uploading it again."}
                </p>
              </div>
            ) : status === "EXPIRED" ? (
              <div className="max-w-xl">
                <p className="text-sm font-semibold text-ink">Upload expired</p>

                <p className="mt-2 text-sm leading-6 text-ink-dim">
                  This upload expired before it was completed.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-run" />

                      <p className="text-sm font-semibold text-ink">
                        Processing media
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-ink-dim">
                      Results will appear here as soon as the pipeline finishes.
                    </p>
                  </div>

                  <PlayCircle
                    size={22}
                    className="shrink-0 text-ink-faint"
                    aria-hidden
                  />
                </div>

                <div className="mt-8">
                  <PipelineSteps
                    item={media}
                    status={status}
                    progress={live?.progress}
                  />
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_26rem]">
            {/* Main workspace */}
            <div className="min-w-0 space-y-5">
              {/* Player */}
              <section className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <div className="flex items-center gap-2">
                    <PlayCircle
                      size={14}
                      className="text-ink-faint"
                      aria-hidden
                    />

                    <span className="text-xs font-medium uppercase tracking-[0.1em] text-ink-faint">
                      Media preview
                    </span>
                  </div>

                  {videoId ? (
                    <span className="text-xs text-ink-faint">YouTube</span>
                  ) : playback ? (
                    <span className="text-xs text-ink-faint">
                      {isVideo ? "Video" : "Audio"}
                    </span>
                  ) : null}
                </div>

                <div className="bg-black">
                  {videoId ? (
                    <YouTubePlayer
                      videoId={videoId}
                      sourceUrl={media.sourceUrl}
                      onReady={(controls) => {
                        ytControls.current = controls;
                        setIsYtReady(true);
                      }}
                      onTime={setCurrentTime}
                    />
                  ) : playback ? (
                    isVideo ? (
                      <video
                        key={playback.playbackUrl}
                        ref={(el) => {
                          playerRef.current = el;
                        }}
                        src={playback.playbackUrl}
                        controls
                        preload="metadata"
                        onTimeUpdate={(e) =>
                          setCurrentTime(e.currentTarget.currentTime)
                        }
                        onSeeked={(e) =>
                          setCurrentTime(e.currentTarget.currentTime)
                        }
                        onLoadedMetadata={() => {
                          hasRetriedPlayback.current = false;
                        }}
                        onError={handlePlayerError}
                        className="aspect-video w-full"
                      />
                    ) : (
                      <div className="flex min-h-48 items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-6">
                        <audio
                          key={playback.playbackUrl}
                          ref={(el) => {
                            playerRef.current = el;
                          }}
                          src={playback.playbackUrl}
                          controls
                          preload="metadata"
                          onTimeUpdate={(e) =>
                            setCurrentTime(e.currentTarget.currentTime)
                          }
                          onSeeked={(e) =>
                            setCurrentTime(e.currentTarget.currentTime)
                          }
                          onLoadedMetadata={() => {
                            hasRetriedPlayback.current = false;
                          }}
                          onError={handlePlayerError}
                          className="w-full max-w-2xl"
                        />
                      </div>
                    )
                  ) : playbackFailed ? (
                    <div
                      role="alert"
                      className="flex min-h-48 items-center justify-center px-6"
                    >
                      <div className="text-center">
                        <p className="text-sm font-medium text-white">
                          The player could not be loaded.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            hasRetriedPlayback.current = false;
                            setPlaybackFailed(false);
                            void loadPlayback();
                          }}
                          className="mt-2 text-xs text-white/60 underline underline-offset-2 hover:text-white"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video w-full animate-pulse bg-neutral-900" />
                  )}
                </div>
              </section>

              {/* AI summary */}
              {transcription ? (
                <>
                  <section className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
                    <div className="border-b border-line px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-hover">
                          <Sparkles
                            size={14}
                            className="text-ink-dim"
                            aria-hidden
                          />
                        </div>

                        <div>
                          <h2 className="text-sm font-semibold text-ink">
                            AI summary
                          </h2>

                          <p className="text-xs text-ink-faint">
                            Generated from the completed transcription
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="max-w-3xl text-sm leading-7 text-ink">
                        {transcription.summary}
                      </p>
                    </div>
                  </section>

                  {transcription.keywords.length > 0 && (
                    <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
                      <div className="mb-4">
                        <h2 className="text-sm font-semibold text-ink">
                          Keywords
                        </h2>

                        <p className="mt-1 text-xs text-ink-faint">
                          Key concepts detected in the media
                        </p>
                      </div>

                      <ul className="flex flex-wrap gap-2">
                        {transcription.keywords.map((keyword) => (
                          <li
                            key={keyword}
                            className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink-dim transition-colors hover:border-line-strong hover:text-ink"
                          >
                            {keyword}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              ) : (
                <section className="rounded-2xl border border-line bg-panel p-5">
                  <p className="text-sm text-ink-dim">
                    No transcription is available for this file.
                  </p>
                </section>
              )}
            </div>

            {/* Transcript */}
            {transcription && (
              <section
                aria-label="Transcript"
                className="min-w-0 overflow-hidden rounded-2xl border border-line bg-panel shadow-sm lg:sticky lg:top-6"
              >
                <div className="border-b border-line px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText
                          size={14}
                          className="shrink-0 text-ink-faint"
                          aria-hidden
                        />

                        <h2 className="text-sm font-semibold text-ink">
                          Transcript
                        </h2>
                      </div>

                      {segments.length > 0 && (
                        <p className="mt-1 pl-5 font-mono text-[11px] text-ink-faint">
                          {segments.length} segments ·{" "}
                          {formatClock(segments[segments.length - 1].end)}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={copyTranscript}
                        className={ghostButton}
                      >
                        {copied ? (
                          <Check size={12} aria-hidden />
                        ) : (
                          <Copy size={12} aria-hidden />
                        )}
                        <span className="hidden sm:inline">
                          {copied ? "Copied" : "Copy"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          downloadText(
                            `${safeFileName(title)}.txt`,
                            transcription.transcript,
                          )
                        }
                        className={ghostButton}
                        title="Download TXT"
                        aria-label="Download TXT"
                      >
                        <Download size={12} aria-hidden />
                        <span className="hidden sm:inline">TXT</span>
                      </button>

                      <button
                        type="button"
                        disabled={segments.length === 0}
                        onClick={() =>
                          downloadText(
                            `${safeFileName(title)}.srt`,
                            toSrt(segments),
                          )
                        }
                        className={ghostButton}
                        title="Download SRT"
                        aria-label="Download SRT"
                      >
                        <Download size={12} aria-hidden />
                        <span className="hidden sm:inline">SRT</span>
                      </button>
                    </div>
                  </div>
                </div>

                <TranscriptPanel
                  segments={segments}
                  fallbackText={transcription.transcript}
                  activeIndex={activeIndex}
                  canSeek={videoId ? isYtReady : playback !== null}
                  onSeek={seekTo}
                />
              </section>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8">
        <Link
          to="/library"
          className="mb-7 inline-flex items-center gap-2 text-sm text-ink-dim transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden />
          <span>Library</span>
        </Link>

        {body}
      </div>
    </main>
  );
}
