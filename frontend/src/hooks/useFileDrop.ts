import { useEffect, useRef, useState } from "react";

/**
 * Detecta arrastre de archivos sobre toda la ventana.
 * Devuelve `true` mientras hay un archivo encima; al soltarlo llama a `onFile`.
 */
export function useFileDrop(onFile: (file: File) => void, enabled: boolean) {
  const [isDragging, setIsDragging] = useState(false);
  const depth = useRef(0);
  const onFileRef = useRef(onFile);

  useEffect(() => {
    onFileRef.current = onFile;
  });

  useEffect(() => {
    if (!enabled) return;

    const hasFiles = (e: DragEvent) =>
      e.dataTransfer?.types.includes("Files") ?? false;

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setIsDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) onFileRef.current(file);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      depth.current = 0;
      setIsDragging(false);
    };
  }, [enabled]);

  return isDragging;
}
