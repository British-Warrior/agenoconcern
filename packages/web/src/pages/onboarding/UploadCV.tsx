import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useCvUpload } from "../../hooks/useOnboarding.js";
import { Button } from "../../components/ui/Button.js";
import { Alert } from "../../components/ui/Alert.js";

const ACCEPTED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function FileIcon() {
  return (
    <svg
      className="w-12 h-12 text-neutral-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      className="w-16 h-16 text-primary-800"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

export function UploadCV() {
  const navigate = useNavigate();
  const upload = useCvUpload();
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Upload Your CV — Indomitable Unity";
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setDropError(null);

      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0]?.errors[0];
        if (!firstError) return;
        if (firstError.code === "file-too-large") {
          setDropError("File is too large. Maximum size is 10 MB.");
        } else if (firstError.code === "file-invalid-type") {
          setDropError("Unsupported file type. Please upload a PDF, DOCX, TXT, JPG, or PNG.");
        } else {
          setDropError(firstError.message);
        }
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      try {
        const { jobId } = await upload.mutateAsync(file);
        navigate(`/onboarding/parsing?jobId=${encodeURIComponent(jobId)}`);
      } catch {
        // error shown via upload.error below
      }
    },
    [upload, navigate],
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES,
    maxSize: MAX_SIZE_BYTES,
    maxFiles: 1,
    disabled: upload.isPending,
  });

  const selectedFile = acceptedFiles[0] ?? null;

  const uploadError =
    dropError ??
    (upload.error instanceof Error ? upload.error.message : null) ??
    null;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">
            Upload your CV
          </h1>
          <p className="text-lg text-neutral-600">
            We'll read your CV and build your profile in under 5 minutes — no
            form-filling required.
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-[var(--radius-lg)]
            bg-white p-10
            flex flex-col items-center justify-center gap-4
            cursor-pointer select-none
            transition-colors duration-150
            ${isDragActive
              ? "border-primary-800 bg-primary-50"
              : "border-neutral-300 hover:border-primary-600 hover:bg-neutral-50"
            }
            ${upload.isPending ? "opacity-60 cursor-not-allowed" : ""}
          `.trim()}
          role="button"
          aria-label="Upload CV — click or drag and drop"
        >
          <input {...getInputProps()} />

          {selectedFile && !upload.isPending ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <FileIcon />
              <p className="font-semibold text-neutral-800 break-all">
                {selectedFile.name}
              </p>
              <p className="text-sm text-neutral-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <UploadIcon />
              {isDragActive ? (
                <p className="text-lg font-semibold text-primary-800">
                  Drop your CV here
                </p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-neutral-800">
                    Drag and drop your CV here
                  </p>
                  <p className="text-neutral-500">or click to browse</p>
                </>
              )}
              <p className="text-sm text-neutral-400 mt-2">
                PDF, DOCX, TXT, JPG or PNG &mdash; max 10 MB
              </p>
            </div>
          )}

          {/* Upload progress overlay */}
          {upload.isPending && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-[var(--radius-lg)] gap-3">
              <svg
                className="animate-spin h-10 w-10 text-primary-800"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-base font-semibold text-primary-800">
                Uploading your CV...
              </p>
            </div>
          )}
        </div>

        {/* Error message */}
        {uploadError && (
          <div className="mt-4">
            <Alert variant="error">{uploadError}</Alert>
          </div>
        )}

        {/* Manual upload button for after selection (if not auto-submitting) */}
        {selectedFile && !upload.isPending && !upload.isSuccess && (
          <div className="mt-6">
            <Button
              fullWidth
              onClick={() => upload.mutate(selectedFile)}
              loading={upload.isPending}
            >
              Upload CV
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
