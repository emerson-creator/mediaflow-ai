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
      <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-5 py-6">
        <p className="text-sm leading-7 text-ink-dim">
          {fallbackText || "No transcript text was produced for this file."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative max-h-[calc(100vh-10rem)] overflow-y-auto px-2 py-2 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]"
    >
      <div className="space-y-0.5">
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
              className={`group relative flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                isActive ? "bg-hover" : "hover:bg-hover/70"
              } ${canSeek ? "cursor-pointer" : "cursor-default"}`}
            >
              {/* Active indicator */}
              <span
                aria-hidden
                className={`absolute bottom-2 left-0 top-2 w-0.5 rounded-full transition-opacity ${
                  isActive ? "bg-run opacity-100" : "bg-transparent opacity-0"
                }`}
              />

              {/* Timestamp */}
              <span
                className={`mt-0.5 w-11 shrink-0 font-mono text-[11px] tabular-nums transition-colors ${
                  isActive
                    ? "font-medium text-run"
                    : "text-ink-faint group-hover:text-ink-dim"
                }`}
              >
                {formatClock(segment.start)}
              </span>

              {/* Transcript */}
              <span
                className={`min-w-0 text-[13px] leading-6 transition-colors ${
                  isActive
                    ? "font-medium text-ink"
                    : "text-ink-dim group-hover:text-ink"
                }`}
              >
                {segment.text.trim()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
