import { STATUS_LABELS, toneOf, type Tone } from "../lib/status";

const DOT: Record<Tone, string> = {
  idle: "bg-ink-faint",
  run: "bg-run motion-safe:animate-pulse",
  ok: "bg-ok",
  bad: "bg-bad",
  warn: "bg-warn",
  muted: "bg-line-strong",
};

const TEXT: Record<Tone, string> = {
  idle: "text-ink-dim",
  run: "text-ink",
  ok: "text-ink",
  bad: "text-bad",
  warn: "text-warn",
  muted: "text-ink-faint",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = toneOf(status);
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${TEXT[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} aria-hidden />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[toneOf(status)]}`}
      aria-hidden
    />
  );
}
