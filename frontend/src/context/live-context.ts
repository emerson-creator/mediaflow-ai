import { createContext } from "react";
import type { MediaItem, ProgressEvent } from "../types";

export interface ActivityEntry {
  id: string;
  mediaId: string;
  stage: ProgressEvent["stage"];
  progress: number;
  message?: string;
  at: string;
}

export interface Toast {
  id: string;
  mediaId: string;
  tone: "ok" | "bad";
  message: string;
}

export interface LiveState {
  isConnected: boolean;
  progressByMediaId: Record<string, ProgressEvent>;
  /** Eventos recientes, el más nuevo primero. */
  activity: ActivityEntry[];
  toasts: Toast[];
  /** mediaId -> nombre legible, para toasts y log de actividad. */
  titles: Record<string, string>;
  dismissToast: (id: string) => void;
  registerMedia: (
    items: Pick<MediaItem, "id" | "title" | "filename">[],
  ) => void;
  subscribe: (listener: (event: ProgressEvent) => void) => () => void;
}

export const LiveContext = createContext<LiveState | null>(null);
