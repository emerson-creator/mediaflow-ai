import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Library,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import { useLibrary } from "../context/useLibrary";
import { useLive } from "../context/useLive";
import { groupByDay } from "../lib/groups";
import { resolveStatus } from "../lib/status";
import { Logo } from "./Logo";
import { StatusDot } from "./StatusBadge";

interface Props {
  /** Modo rail: solo iconos (escritorio, plegada). */
  isRail: boolean;
  onToggleCollapse: () => void;
  /** Se llama al navegar; el cajón móvil lo usa para cerrarse. */
  onNavigate?: () => void;
  /** Solo en el cajón móvil: botón de cerrar en vez del de plegar. */
  onClose?: () => void;
}

const RECENT_LIMIT = 12;

const railButton =
  "flex h-9 w-9 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-hover hover:text-ink";

export function SidebarContent({
  isRail,
  onToggleCollapse,
  onNavigate,
  onClose,
}: Props) {
  const { user, logout } = useAuth();
  const { items, isLoading } = useLibrary();
  const { progressByMediaId, isConnected } = useLive();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [isListOpen, setIsListOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Atajos globales: N -> Home, / -> buscar en la barra (salvo en Library, que tiene su propia búsqueda).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        onNavigate?.();
        navigate("/dashboard");
      } else if (
        e.key === "/" &&
        !isRail &&
        !location.pathname.startsWith("/library")
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, location.pathname, isRail, onNavigate]);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [items],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visible = normalizedQuery
    ? sorted.filter((item) =>
        (item.title || item.filename).toLowerCase().includes(normalizedQuery),
      )
    : sorted.slice(0, RECENT_LIMIT);
  const groups = useMemo(() => groupByDay(visible), [visible]);

  const liveLabel = isConnected ? "Live" : "Offline";
  const liveDot = isConnected ? "bg-ok" : "bg-bad";

  // ---------- Rail (plegada) ----------
  if (isRail) {
    return (
      <div className="flex h-full flex-col items-center gap-1 py-3">
        <Link to="/dashboard" aria-label="MediaFlow home" className="mb-1 py-2">
          <Logo showWordmark={false} />
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className={railButton}
        >
          <PanelLeftOpen size={18} aria-hidden />
        </button>
        <NavLink
          to="/dashboard"
          end
          aria-label="New media"
          title="New media"
          className={({ isActive }) =>
            `${railButton} ${isActive ? "bg-hover text-ink" : ""}`
          }
        >
          <Plus size={18} aria-hidden />
        </NavLink>
        <NavLink
          to="/library"
          aria-label="Library"
          title="Library"
          className={({ isActive }) =>
            `${railButton} ${isActive ? "bg-hover text-ink" : ""}`
          }
        >
          <Library size={18} aria-hidden />
        </NavLink>

        <div className="mt-auto flex flex-col items-center gap-3 pb-1">
          <span
            className={`h-1.5 w-1.5 rounded-full ${liveDot}`}
            title={liveLabel}
            aria-label={liveLabel}
          />
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className={railButton}
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  // ---------- Expandida ----------
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <Link to="/dashboard" onClick={onNavigate} aria-label="MediaFlow home">
          <Logo />
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            <PanelLeftClose size={18} aria-hidden />
          </button>
        )}
      </div>

      <div className="space-y-2 px-3 pb-3">
        <NavLink
          to="/dashboard"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
              isActive
                ? "bg-hover text-ink"
                : "text-ink-dim hover:bg-hover hover:text-ink"
            }`
          }
        >
          <Plus size={16} aria-hidden />
          New media
          <kbd className="ml-auto rounded border border-line px-1 font-mono text-[11px] text-ink-faint">
            N
          </kbd>
        </NavLink>

        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search library"
            aria-label="Search library"
            className="w-full rounded-md border border-line bg-panel py-1.5 pl-8 pr-8 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
          {!query && (
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line px-1 font-mono text-[11px] text-ink-faint">
              /
            </kbd>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pb-1">
        <button
          type="button"
          onClick={() => setIsListOpen((open) => !open)}
          aria-expanded={isListOpen}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-ink-dim transition-colors hover:text-ink"
        >
          {isListOpen ? (
            <ChevronDown size={14} aria-hidden />
          ) : (
            <ChevronRight size={14} aria-hidden />
          )}
          Library
          <span className="font-mono tabular-nums text-ink-faint">
            {items.length}
          </span>
        </button>
        <Link
          to="/library"
          onClick={onNavigate}
          className="rounded-md px-2.5 py-1 text-xs text-ink-dim transition-colors hover:text-ink"
        >
          View all
        </Link>
      </div>

      <nav
        aria-label="Library"
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
      >
        {isListOpen && (
          <>
            {isLoading && items.length === 0 && (
              <div className="space-y-2 px-2.5 pt-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-4 rounded-sm bg-hover motion-safe:animate-pulse"
                  />
                ))}
              </div>
            )}

            {!isLoading && groups.length === 0 && (
              <p className="px-2.5 pt-2 text-xs text-ink-faint">
                {normalizedQuery ? "No matches." : "Nothing here yet."}
              </p>
            )}

            {groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <h3 className="px-2.5 pb-1 pt-3 text-xs text-ink-faint">
                  {group.label}
                </h3>
                <ul>
                  {group.items.map((item) => {
                    const name = item.title || item.filename;
                    const status = resolveStatus(
                      item,
                      progressByMediaId[item.id],
                    );
                    return (
                      <li key={item.id}>
                        <NavLink
                          to={`/media/${item.id}`}
                          onClick={onNavigate}
                          title={name}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                              isActive
                                ? "bg-hover text-ink"
                                : "text-ink-dim hover:bg-hover hover:text-ink"
                            }`
                          }
                        >
                          <StatusDot status={status} />
                          <span className="truncate">{name}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-dim">{user?.email}</p>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink-faint">
              <span
                className={`h-1.5 w-1.5 rounded-full ${liveDot}`}
                aria-hidden
              />
              {liveLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-2 text-ink-faint transition-colors hover:bg-hover hover:text-ink"
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
