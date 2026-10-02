import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Download } from "lucide-react";
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
  "inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-ink-dim transition-colors hover:bg-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent";

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

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const result = await mediaApi.getMediaDetails(id);
      setData(result);
      registerMedia([result.media]);
      setLoadError(null);
      const isYouTubeVideo =
        result.media.sourceType === "YOUTUBE" &&
        result.media.sourceUrl &&
        extractYouTubeId(result.media.sourceUrl);
      if (result.media.status === "DONE" && !isYouTubeVideo) {
        void loadPlayback();
      }
    } catch (err) {
      setLoadError(
        isAxiosError(err) && err.response?.status === 404
          ? "notfound"
          : "failed",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, loadPlayback, registerMedia]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  // El socket vive en AppShell; aquí solo se reacciona al fin del pipeline de este media.
  useLiveEvents((event) => {
    if (event.mediaId !== id) return;
    if (event.stage === "DONE" || event.stage === "FAILED") void load();
  });

  const isDone = data?.media.status === "DONE";

  // Videos de YouTube: se incrusta el reproductor oficial en vez del audio extraído.
  const videoId = useMemo(
    () =>
      data?.media.sourceType === "YOUTUBE" && data.media.sourceUrl
        ? extractYouTubeId(data.media.sourceUrl)
        : null,
    [data],
  );

  const transcription = data?.transcription ?? null;
  const segments = useMemo(
    () => transcription?.segments ?? [],
    [transcription],
  );

  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].start <= currentTime) idx = i;
      else break;
    }
    // Pasado el final del último segmento, no se resalta nada.
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
      /* el navegador puede bloquear play(); el salto ya se hizo */
    });
  }

  function handlePlayerError() {
    // La URL presignada dura 1 hora: si falla, se pide una nueva una sola vez.
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
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }

  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <div className="space-y-4" aria-busy="true">
        <div className="h-8 w-72 rounded-sm bg-hover motion-safe:animate-pulse" />
        <div className="h-4 w-96 max-w-full rounded-sm bg-hover motion-safe:animate-pulse" />
        <div className="grid gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="aspect-video rounded-lg bg-hover motion-safe:animate-pulse" />
          <div className="h-80 rounded-lg bg-hover motion-safe:animate-pulse" />
        </div>
      </div>
    );
  } else if (loadError === "notfound") {
    body = (
      <div className="py-16 text-center">
        <p className="text-sm font-medium">Media not found</p>
        <p className="mt-1 text-sm text-ink-dim">
          It may have been removed, or it belongs to another account.
        </p>
      </div>
    );
  } else if (loadError === "failed" || !data) {
    body = (
      <div
        role="alert"
        className="flex items-center justify-between gap-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad"
      >
        <span>Could not load this media.</span>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            void load();
          }}
          className="underline underline-offset-2"
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
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <StatusBadge status={status} />
          </div>

          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <dt className="text-xs text-ink-faint">Source</dt>
              <dd className="mt-0.5 text-sm">
                {media.sourceType === "YOUTUBE" && media.sourceUrl ? (
                  <a
                    href={media.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    YouTube
                  </a>
                ) : media.sourceType === "YOUTUBE" ? (
                  "YouTube"
                ) : (
                  "Upload"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Size</dt>
              <dd className="mt-0.5 font-mono text-sm">
                {formatBytes(media.sizeBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Created</dt>
              <dd className="mt-0.5 text-sm">
                {new Date(media.createdAt).toLocaleString()}
              </dd>
            </div>
            {timeToResult !== null && timeToResult >= 0 && (
              <div>
                <dt className="text-xs text-ink-faint">Time to result</dt>
                <dd className="mt-0.5 font-mono text-sm">
                  {timeToResult.toFixed(1)} s
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-ink-faint">ID</dt>
              <dd className="mt-0.5 font-mono text-sm text-ink-dim">
                {media.id.slice(0, 8)}
              </dd>
            </div>
          </dl>
        </div>

        {!isDone ? (
          <div className="rounded-lg border border-line bg-panel p-6">
            {status === "FAILED" ? (
              <>
                <p className="text-sm font-medium text-bad">
                  Processing failed
                </p>
                <p className="mt-1 text-sm text-ink-dim">
                  {live?.message ??
                    "This file could not be processed. Try uploading it again."}
                </p>
              </>
            ) : status === "EXPIRED" ? (
              <p className="text-sm text-ink-dim">
                This upload expired before it was completed.
              </p>
            ) : (
              <>
                <p className="mb-4 text-sm text-ink-dim">
                  Results appear here as soon as processing finishes.
                </p>
                <PipelineSteps
                  item={media}
                  status={status}
                  progress={live?.progress}
                />
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-w-0 space-y-8">
              <div>
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
                      className="aspect-video w-full rounded-lg border border-line bg-black"
                    />
                  ) : (
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
                      className="w-full"
                    />
                  )
                ) : playbackFailed ? (
                  <div
                    role="alert"
                    className="flex items-center justify-between gap-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad"
                  >
                    <span>The player could not be loaded.</span>
                    <button
                      type="button"
                      onClick={() => {
                        hasRetriedPlayback.current = false;
                        setPlaybackFailed(false);
                        void loadPlayback();
                      }}
                      className="underline underline-offset-2"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-lg bg-hover motion-safe:animate-pulse" />
                )}
              </div>

              {transcription ? (
                <>
                  <section aria-labelledby="summary-heading">
                    <h2
                      id="summary-heading"
                      className="mb-2 text-sm font-medium"
                    >
                      Summary
                    </h2>
                    <p className="max-w-prose text-sm leading-relaxed text-ink">
                      {transcription.summary}
                    </p>
                  </section>

                  {transcription.keywords.length > 0 && (
                    <section aria-labelledby="keywords-heading">
                      <h2
                        id="keywords-heading"
                        className="mb-2 text-sm font-medium"
                      >
                        Keywords
                      </h2>
                      <ul className="flex flex-wrap gap-2">
                        {transcription.keywords.map((keyword) => (
                          <li
                            key={keyword}
                            className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink-dim"
                          >
                            {keyword}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-dim">
                  No transcription is available for this file.
                </p>
              )}
            </div>

            {transcription && (
              <section
                aria-label="Transcript"
                className="min-w-0 self-start overflow-hidden rounded-lg border border-line bg-panel lg:sticky lg:top-20"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-sm font-medium">Transcript</h2>
                    {segments.length > 0 && (
                      <span className="font-mono text-xs text-ink-faint">
                        {formatClock(segments[segments.length - 1].end)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
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
                      {copied ? "Copied" : "Copy"}
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
                    >
                      <Download size={12} aria-hidden />
                      .txt
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
                    >
                      <Download size={12} aria-hidden />
                      .srt
                    </button>
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
    <>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-dim transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden />
          Media
        </Link>
        {body}
      </main>
    </>
  );
}
