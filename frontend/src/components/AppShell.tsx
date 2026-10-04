import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { LibraryProvider } from "../context/LibraryProvider";
import { LiveProvider } from "../context/LiveProvider";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { Logo } from "./Logo";
import { SidebarContent } from "./Sidebar";
import { ToastViewport } from "./ToastViewPort";

const COLLAPSED_KEY = "mediaflow.sidebar.collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function ShellLayout() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      /* el almacenamiento puede estar bloqueado; la preferencia solo no persiste */
    }
  }, [collapsed]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-canvas">
      {isDesktop ? (
        <div
          className={`sticky top-0 h-screen shrink-0 overflow-hidden border-r border-line transition-[width] duration-200 ${
            collapsed ? "w-14" : "w-64"
          }`}
        >
          <SidebarContent
            isRail={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </div>
      ) : (
        mobileOpen && (
          <div
            className="fixed inset-0 z-40"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMobile}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="relative h-full w-72 max-w-[85vw] border-r border-line bg-canvas">
              <SidebarContent
                isRail={false}
                onToggleCollapse={closeMobile}
                onNavigate={closeMobile}
                onClose={closeMobile}
              />
            </div>
          </div>
        )
      )}

      <div className="min-w-0 flex-1">
        {!isDesktop && (
          <div className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="text-ink-dim transition-colors hover:text-ink"
            >
              <Menu size={18} aria-hidden />
            </button>
            <Logo />
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}

/**
 * Layout de las rutas protegidas: un único socket (LiveProvider), la biblioteca
 * compartida (LibraryProvider) y la barra lateral, que persisten al navegar.
 */
export function AppShell() {
  return (
    <LiveProvider>
      <LibraryProvider>
        <ShellLayout />
      </LibraryProvider>
      <ToastViewport />
    </LiveProvider>
  );
}
