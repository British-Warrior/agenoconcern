import { useCallback } from "react";
import type { CircleNoteWithAuthorAndAttachments } from "@indomitable-unity/shared";
import { getDownloadUrl } from "../../api/circles.js";

interface NoteCardProps {
  note: CircleNoteWithAuthorAndAttachments;
  circleId: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NoteCard({ note, circleId }: NoteCardProps) {
  const handleDownload = useCallback(
    async (noteId: string, attachmentId: string) => {
      try {
        const { downloadUrl } = await getDownloadUrl(circleId, noteId, attachmentId);
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      } catch {
        // Silent — user will see nothing happened; could add toast in future
      }
    },
    [circleId],
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white px-4 py-3">
      {/* Author + timestamp */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-primary-700">
            {note.authorName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-neutral-900">{note.authorName}</span>
        <span className="text-xs text-neutral-400 ml-auto whitespace-nowrap">
          {formatRelativeTime(note.createdAt)}
        </span>
      </div>

      {/* Body */}
      <p className="text-sm text-neutral-800 whitespace-pre-wrap break-words leading-relaxed">
        {note.body}
      </p>

      {/* Attachments */}
      {note.attachments.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {note.attachments.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              onClick={() => void handleDownload(note.id, attachment.id)}
              className="flex items-center gap-2 w-full text-left rounded-[var(--radius-md)] border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 px-3 py-2 transition-colors duration-150 group"
            >
              {/* File icon */}
              <svg
                className="w-4 h-4 text-neutral-400 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-neutral-700 truncate block group-hover:text-primary-800 transition-colors">
                  {attachment.fileName}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {formatFileSize(attachment.fileSizeBytes)}
                </span>
              </div>
              {/* Download indicator */}
              <svg
                className="w-4 h-4 text-neutral-400 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
