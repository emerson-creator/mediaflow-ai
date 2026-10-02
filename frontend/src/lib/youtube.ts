const VIDEO_ID = /^[\w-]{11}$/;

/** Soporta youtube.com/watch?v=, youtu.be/, /embed/ y /shorts/. */
export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    let candidate: string | null = null;
    if (host === "youtu.be") {
      candidate = parsed.pathname.split("/")[1] ?? null;
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      candidate =
        parsed.searchParams.get("v") ??
        parsed.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] ??
        null;
    }

    return candidate && VIDEO_ID.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
