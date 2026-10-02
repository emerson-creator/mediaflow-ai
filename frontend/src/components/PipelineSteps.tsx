import type { MediaItem } from "../types";
import { STATUS_LABELS, stagesFor } from "../lib/status";

interface Props {
  item: MediaItem;
  status: string;
  progress?: number;
}

export function PipelineSteps({ item, status, progress }: Props) {
  const stages = stagesFor(item);
  const currentIdx = stages.indexOf(status);

  function segmentClass(idx: number): string {
    if (status === "DONE") return "bg-ok";
    if (status === "FAILED") return "bg-bad/40";
    if (status === "EXPIRED") return "bg-line";
    if (currentIdx === -1) return "bg-line";
    if (idx < currentIdx) return "bg-ink-dim";
    if (idx === currentIdx) return "bg-run motion-safe:animate-pulse";
    return "bg-line";
  }

  const label =
    currentIdx >= 0
      ? `${STATUS_LABELS[status]}, step ${currentIdx + 1} of ${stages.length}`
      : (STATUS_LABELS[status] ?? status);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1" role="img" aria-label={label}>
        {stages.map((stage, idx) => (
          <span
            key={stage}
            title={STATUS_LABELS[stage]}
            className={`h-1 w-6 rounded-full transition-colors duration-300 ${segmentClass(idx)}`}
          />
        ))}
      </div>
      {currentIdx >= 0 && typeof progress === "number" && (
        <span className="font-mono text-xs tabular-nums text-ink-dim">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
