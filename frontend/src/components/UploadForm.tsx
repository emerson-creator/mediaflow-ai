import { useRef, useState } from "react";
import * as mediaApi from "../api/media";

interface Props {
  onUploaded: () => void; // notifies parent to refresh the list
}

export function UploadForm({ onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setIsUploading(true);
    let uploadSucceeded = false;
    try {
      // 1. Ask the Gateway for a presigned URL
      const { mediaId, uploadUrl } = await mediaApi.createUpload(file);

      // 2. Upload the file directly to MinIO (bypasses our backend)
      await mediaApi.uploadToStorage(uploadUrl, file);

      // 3. Confirm the upload so the pipeline kicks off
      await mediaApi.confirmUpload(mediaId);

      uploadSucceeded = true;
      onUploaded();
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (uploadSucceeded) {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="mb-6">
      <label className="inline-block">
        <span className="sr-only">Choose file</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          disabled={isUploading}
          onChange={handleFileChange}
          className="block text-sm text-gray-600
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:bg-blue-600 file:text-white
            file:cursor-pointer hover:file:bg-blue-700
            disabled:opacity-50"
        />
      </label>
      {isUploading && (
        <p className="mt-2 text-sm text-gray-500">
          Uploading {selectedFile?.name}...
        </p>
      )}
      {!isUploading && selectedFile && !error && (
        <p className="mt-2 text-sm text-gray-500">
          Selected: {selectedFile.name}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
