import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex items-end gap-0.5" aria-hidden>
            <span className="h-2 w-1 rounded-full bg-ink-faint" />
            <span className="h-3 w-1 rounded-full bg-ink-dim" />
            <span className="h-4 w-1 rounded-full bg-ink" />
          </span>
          <span className="text-sm font-semibold">MediaFlow</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-ink-dim">{subtitle}</p>

        {children}

        <p className="mt-6 text-sm text-ink-dim">{footer}</p>
      </div>
    </div>
  );
}

export const fieldLabelClass = "mb-1.5 block text-sm text-ink-dim";

export const fieldInputClass =
  "w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none disabled:opacity-50";

export const submitButtonClass =
  "w-full rounded-md bg-ink py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40";

export function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad"
    >
      {message}
    </div>
  );
}
