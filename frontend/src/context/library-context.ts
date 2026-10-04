import { createContext } from "react";
import type { UploadController } from "../hooks/useUpload";
import type { MediaItem } from "../types";

export interface LibraryState {
  items: MediaItem[];
  isLoading: boolean;
  error: string | null;
  /** IDs recién añadidos, para resaltarlos unos segundos. */
  freshIds: Set<string>;
  reload: () => Promise<void>;
  /** La subida vive aquí para sobrevivir a la navegación entre páginas. */
  upload: UploadController;
}

export const LibraryContext = createContext<LibraryState | null>(null);
