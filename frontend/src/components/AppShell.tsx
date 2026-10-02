import { Outlet } from "react-router-dom";
import { LiveProvider } from "../context/LiveProvider";
import { AppHeader } from "./AppHeader";
import { ToastViewport } from "./ToastViewPort";

/**
 * Layout de las rutas protegidas. Mantiene un único socket y el estado en vivo
 * mientras el usuario navega entre el dashboard y el detalle.
 */
export function AppShell() {
  return (
    <LiveProvider>
      <div className="min-h-screen bg-canvas">
        <AppHeader />
        <Outlet />
      </div>
      <ToastViewport />
    </LiveProvider>
  );
}
