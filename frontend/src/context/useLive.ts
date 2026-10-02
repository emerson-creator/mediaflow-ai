import { useContext, useEffect, useRef } from "react";
import type { ProgressEvent } from "../types";
import { LiveContext } from "./live-context";

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used inside <LiveProvider>");
  return ctx;
}

/** Ejecuta `listener` en cada evento de progreso mientras el componente esté montado. */
export function useLiveEvents(listener: (event: ProgressEvent) => void) {
  const { subscribe } = useLive();
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  });

  useEffect(
    () => subscribe((event) => listenerRef.current(event)),
    [subscribe],
  );
}
