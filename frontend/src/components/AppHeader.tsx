import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useLive } from "../context/useLive";

export function AppHeader() {
  const { user, logout } = useAuth();
  const { isConnected } = useLive();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="flex items-end gap-0.5" aria-hidden>
            <span className="h-2 w-1 rounded-full bg-ink-faint" />
            <span className="h-3 w-1 rounded-full bg-ink-dim" />
            <span className="h-4 w-1 rounded-full bg-ink" />
          </span>
          <span className="text-sm font-semibold">MediaFlow</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <span
            className="inline-flex items-center gap-2 text-ink-dim"
            title={
              isConnected
                ? "Receiving live updates"
                : "Live updates are offline"
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? "bg-ok" : "bg-bad"
              }`}
              aria-hidden
            />
            {isConnected ? "Live" : "Offline"}
          </span>
          <span className="hidden text-ink-dim sm:inline">{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-ink-dim transition-colors hover:text-ink"
          >
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
