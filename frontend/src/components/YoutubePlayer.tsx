import { useEffect, useRef, useState } from "react";

export interface YouTubeControls {
  seekTo: (seconds: number) => void;
}

interface Props {
  videoId: string;
  sourceUrl: string | null;
  onReady: (controls: YouTubeControls) => void;
  onTime: (seconds: number) => void;
}

// Tipos mínimos de la IFrame API de YouTube (solo lo que se usa aquí).
interface YTPlayer {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    host: HTMLElement,
    options: {
      videoId: string;
      host?: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  if (!apiPromise) {
    apiPromise = new Promise<YTNamespace>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT) resolve(window.YT);
      };

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        reject(new Error("YouTube IFrame API failed to load"));
      };
      document.head.appendChild(script);
    });
  }

  return apiPromise;
}

export function YouTubePlayer({ videoId, sourceUrl, onReady, onTime }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onTimeRef = useRef(onTime);
  const [hasProblem, setHasProblem] = useState(false);

  useEffect(() => {
    onReadyRef.current = onReady;
    onTimeRef.current = onTime;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let player: YTPlayer | null = null;
    let timer: number | undefined;

    const host = document.createElement("div");
    container.appendChild(host);

    const stopPolling = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };
    const emitTime = () => {
      if (player) onTimeRef.current(player.getCurrentTime());
    };

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(host, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          playerVars: { rel: 0, playsinline: 1 },
          events: {
            onReady: () => {
              onReadyRef.current({
                seekTo: (seconds) => {
                  player?.seekTo(seconds, true);
                  player?.playVideo();
                  onTimeRef.current(seconds);
                },
              });
            },
            onStateChange: (event) => {
              stopPolling();
              if (event.data === YT.PlayerState.PLAYING) {
                timer = window.setInterval(emitTime, 250);
              } else {
                emitTime();
              }
            },
            // Algunos videos bloquean el embebido (errores 101/150).
            onError: () => setHasProblem(true),
          },
        });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setHasProblem(true);
      });

    return () => {
      cancelled = true;
      stopPolling();
      player?.destroy();
      container.replaceChildren();
    };
  }, [videoId]);

  return (
    <div>
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-black [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full"
      />
      {hasProblem && (
        <p role="alert" className="mt-2 text-sm text-bad">
          This video can't be played here.{" "}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Open it on YouTube
            </a>
          )}
        </p>
      )}
    </div>
  );
}
