import { useEffect, useRef } from "react";
import type { TranscriptSegment } from "../types";
import { formatClock } from "../lib/transcript";

interface Props {
  segments: TranscriptSegment[];
  fallbackText: string;
  activeIndex: number;
  canSeek: boolean;
  onSeek: (seconds: number) => void;
}

export function TranscriptPanel({
  segments,
  fallbackText,
  activeIndex,
  canSeek,
  onSeek,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Mantiene visible el segmento activo sin mover la página entera.
  useEffect(() => {
    const container = containerRef.current;
    const el = itemRefs.current[activeIndex];
    if (!container || !el) return;

    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    const outOfView =
      top < container.scrollTop ||
      bottom > container.scrollTop + container.clientHeight;
    if (!outOfView) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.scrollTo({
      top: Math.max(0, top - container.clientHeight / 3),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeIndex]);

  if (segments.length === 0) {
    return (
      <div className="p-4 text-sm leading-relaxed text-ink-dim">
        {fallbackText || "No transcript text was produced for this file."}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative max-h-[28rem] overflow-y-auto p-2 lg:max-h-[calc(100vh-14rem)]"
    >
      {segments.map((segment, idx) => {
        const isActive = idx === activeIndex;
        return (
          <button
            key={`${segment.start}-${idx}`}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            type="button"
            disabled={!canSeek}
            onClick={() => onSeek(segment.start)}
            aria-current={isActive ? "true" : undefined}
            className={`flex w-full gap-3 rounded-md px-3 py-2 text-left transition-colors enabled:hover:bg-hover disabled:cursor-default ${
              isActive ? "bg-hover" : ""
            }`}
          >
            <span
              className={`mt-0.5 shrink-0 font-mono text-xs tabular-nums ${
                isActive ? "text-run" : "text-ink-faint"
              }`}
            >
              {formatClock(segment.start)}
            </span>
            <span
              className={`text-sm leading-relaxed ${
                isActive ? "text-ink" : "text-ink-dim"
              }`}
            >
              {segment.text.trim()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
