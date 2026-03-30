import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "../ui/Button.js";
import { usePostNote } from "../../hooks/useCircles.js";
import { getAttachmentUrl } from "../../api/circles.js";

interface NoteComposerProps {
  circleId: string;
}

interface PendingFile {
  file: File;
  id: string;
}

const ACCEPTED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

export function NoteComposer({ circleId }: NoteComposerProps) {
  const [body, setBody] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const postNote = usePostNote(circleId);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const remaining = MAX_FILES - pendingFiles.length;
      const toAdd = accepted.slice(0, remaining).map((file) => ({
        file,
        id: `${file.name}-${file.size}-${Date.now()}`,
      }));
      setPendingFiles((prev) => [...prev, ...toAdd]);
    },
    [pendingFiles.length],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES - pendingFiles.length,
    disabled: pendingFiles.length >= MAX_FILES,
  });

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== id));
  };

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const handleSubmit = useCallback(async () => {
    if (!body.trim() && pendingFiles.length === 0) return;
    setSubmitError(null);

    // Upload all attachments
    const uploaded: Array<{
      s3Key: string;
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
    }> = [];

    if (pendingFiles.length > 0) {
      for (let i = 0; i < pendingFiles.length; i++) {
        const { file } = pendingFiles[i];
        setUploadStatus(`Uploading ${i + 1}/${pendingFiles.length}...`);

        try {
          // Get presigned upload URL
          const { uploadUrl, s3Key } = await getAttachmentUrl(circleId, {
            fileName: file.name,
            mimeType: file.type,
            fileSizeBytes: file.size,
          });

          // PUT file to presigned URL
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });

          if (!putRes.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          uploaded.push({
            s3Key,
            fileName: file.name,
            mimeType: file.type,
            fileSizeBytes: file.size,
          });
        } catch (err) {
          setUploadStatus(null);
          setSubmitError(
            err instanceof Error ? err.message : `Failed to upload ${file.name}`,
          );
          return;
        }
      }

      setUploadStatus(null);
    }

    // Post the note
    postNote.mutate(
      { body: body.trim(), attachments: uploaded.length > 0 ? uploaded : undefined },
      {
        onSuccess: () => {
          setBody("");
          setPendingFiles([]);
          setSubmitError(null);
          textareaRef.current?.focus();
        },
        onError: (err) => {
          setSubmitError(
            err instanceof Error ? err.message : "Failed to post note. Please try again.",
          );
        },
      },
    );
  }, [body, pendingFiles, circleId, postNote]);

  const isUploading = uploadStatus !== null;
  const isSubmitting = isUploading || postNote.isPending;
  const canSubmit = body.trim().length > 0 && !isSubmitting;

  return (
    <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-4">
      {/* Text area */}
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share a note with your Circle..."
        rows={3}
        disabled={isSubmitting}
        className="w-full text-sm text-neutral-800 placeholder-neutral-400 outline-none resize-none leading-relaxed disabled:opacity-50 border border-neutral-300 rounded-[var(--radius-md)] px-3 py-2 bg-white focus-visible:border-accent-500 focus-visible:ring-1 focus-visible:ring-accent-500 transition-colors"
      />

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`mt-2 rounded-[var(--radius-md)] border-2 border-dashed px-4 py-3 text-center cursor-pointer transition-colors duration-150 ${
          isDragActive
            ? "border-primary-400 bg-primary-50"
            : pendingFiles.length >= MAX_FILES
              ? "border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-50"
              : "border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-xs text-neutral-500">
          {isDragActive
            ? "Drop files here..."
            : pendingFiles.length >= MAX_FILES
              ? "Maximum 5 files attached"
              : "Attach files — PDF, DOCX, TXT, JPEG, PNG, WEBP (max 10 MB each)"}
        </p>
      </div>

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <p className="mt-1.5 text-xs text-red-600">
          {fileRejections[0].errors[0]?.message ?? "Some files were rejected."}
        </p>
      )}

      {/* Pending files list */}
      {pendingFiles.length > 0 && (
        <ul className="mt-2 space-y-1">
          {pendingFiles.map((pf) => (
            <li
              key={pf.id}
              className="flex items-center gap-2 text-xs text-neutral-700"
            >
              <span className="flex-1 truncate">{pf.file.name}</span>
              <span className="text-neutral-400">{formatFileSize(pf.file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(pf.id)}
                disabled={isSubmitting}
                className="text-neutral-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                aria-label={`Remove ${pf.file.name}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Submit error */}
      {submitError && (
        <p className="mt-2 text-xs text-red-600">{submitError}</p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
        <span className="text-xs text-neutral-400">
          {isUploading ? uploadStatus : null}
        </span>
        <Button
          variant="primary"
          size="default"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          loading={isSubmitting}
          className="px-4 py-2 text-sm min-h-0"
        >
          Post note
        </Button>
      </div>
    </div>
  );
}
