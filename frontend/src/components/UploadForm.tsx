import { useRef, useState } from "react";
import * as mediaApi from "../api/media";

interface Props {
  onUploaded: () => void;
}

type Mode = "file" | "youtube";

const YOUTUBE_URL_PATTERN =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;

export function UploadForm({ onUploaded }: Props) {
  const [mode, setMode] = useState<Mode>("file");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const { mediaId, uploadUrl } = await mediaApi.createUpload(file);
      await mediaApi.uploadToStorage(uploadUrl, file);
      await mediaApi.confirmUpload(mediaId);
      onUploaded();
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleYoutubeSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!YOUTUBE_URL_PATTERN.test(youtubeUrl)) {
      setError("Enter a valid YouTube URL (youtube.com/watch or youtu.be)");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await mediaApi.createYoutubeUpload(youtubeUrl);
      setYoutubeUrl("");
      onUploaded();
    } catch (err: unknown) {
      const message = (err as {
        response?: { data?: { message?: unknown } };
      }).response?.data?.message;
      const msg = Array.isArray(message)
        ? String(message[0])
        : typeof message === "string"
          ? message
          : "Could not process that YouTube URL.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mb-6">
      <div className="flex gap-1 mb-3 border border-gray-200 rounded-lg p-1 w-fit bg-gray-50">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === "file" ? "bg-white shadow-sm font-medium" : "text-gray-500"
          }`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("youtube")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === "youtube"
              ? "bg-white shadow-sm font-medium"
              : "text-gray-500"
          }`}
        >
          YouTube URL
        </button>
      </div>

      {mode === "file" ? (
        <label className="inline-block">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            disabled={isSubmitting}
            onChange={handleFileChange}
            className="block text-sm text-gray-600
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:bg-blue-600 file:text-white
              file:cursor-pointer hover:file:bg-blue-700
              disabled:opacity-50"
          />
        </label>
      ) : (
        <form onSubmit={handleYoutubeSubmit} className="flex gap-2 max-w-lg">
          <input
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSubmitting || !youtubeUrl}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {isSubmitting ? "Processing..." : "Process"}
          </button>
        </form>
      )}

      {isSubmitting && mode === "file" && (
        <p className="mt-2 text-sm text-gray-500">Uploading...</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
