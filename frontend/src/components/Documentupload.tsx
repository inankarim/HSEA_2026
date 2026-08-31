import { useRef, useState } from "react";
import { inputClasses } from "./Formfield";
import { documents } from "../lib/Documents";
import { ApiError } from "../lib/api";
import {
  MAX_DOCUMENT_SIZE_BYTES,
  acceptAttrFor,
  type DocumentKind,
  type DocumentType,
  type DocumentUiState,
} from "../types/Document";

/**
 * Single-slot document upload widget. Deliberately keeps only lightweight
 * state (a status string + a 0-1 progress number) — never the file's
 * binary/base64 content, never a preview render for anything but images
 * the browser already renders natively via <input type=file>. The
 * lifecycle is strictly: select -> upload -> save -> "✓ Uploaded". We
 * never fetch the file back from the server to show it (see
 * lib/documents.ts `downloadUrl`, only used for an explicit "view" link
 * the applicant can click, not auto-loaded).
 */
export default function DocumentUpload({
  applicationId,
  documentType,
  label,
  kind,
  required,
  guestToken,
  initialStatus,
  initialFilename,
  disabled,
  concurrencyGate,
  onUploaded,
  onRemoved,
}: {
  applicationId: string;
  documentType: DocumentType;
  label: string;
  kind: DocumentKind;
  required: boolean;
  guestToken?: string | null;
  initialStatus?: "UPLOADED";
  initialFilename?: string;
  disabled?: boolean;
  /** Caller-provided gate so only ~2-3 uploads run at once across the whole form. */
  concurrencyGate: (fn: () => Promise<void>) => Promise<void>;
  onUploaded?: (documentType: DocumentType, filename: string) => void;
  onRemoved?: (documentType: DocumentType) => void;
}) {
  const [state, setState] = useState<DocumentUiState>(
    initialStatus === "UPLOADED" ? "uploaded" : "idle",
  );
  const [filename, setFilename] = useState<string | null>(initialFilename || null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pendingFile = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateLocally(file: File): string | null {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return "That file is too large. Maximum size is 2MB.";
    }
    const allowed = acceptAttrFor(kind).split(",");
    if (!allowed.includes(file.type)) {
      return kind === "image"
        ? "Please choose a JPEG, PNG, or WebP file."
        : kind === "pdf"
          ? "Please choose a PDF file."
          : "Please choose a PDF, JPEG, PNG, or WebP file.";
    }
    return null;
  }

  async function doUpload(file: File) {
    setState("uploading");
    setProgress(0);
    setError(null);
    try {
      const doc = await documents.upload(applicationId, documentType, file, {
        guestToken,
        onProgress: setProgress,
      });
      setState("uploaded");
      setFilename(doc.originalFilename);
      onUploaded?.(documentType, doc.originalFilename);
    } catch (err) {
      setState("failed");
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const localError = validateLocally(file);
    if (localError) {
      setState("failed");
      setError(localError);
      return;
    }

    pendingFile.current = file;
    setState("selected");
    setError(null);
    concurrencyGate(() => doUpload(file));
  }

  async function handleRemove() {
    setError(null);
    try {
      await documents.remove(applicationId, documentType, guestToken);
      setState("idle");
      setFilename(null);
      onRemoved?.(documentType);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove this file.");
    }
  }

  function handleRetry() {
    if (pendingFile.current) {
      concurrencyGate(() => doUpload(pendingFile.current as File));
    } else {
      inputRef.current?.click();
    }
  }

  return (
    <div className="rounded-lg border border-navy-deep/10 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-navy-deep/70">
          {label}
          {required && <span className="ml-1 text-accent-cyan">*</span>}
        </span>
        <span className="text-[11px] font-medium text-navy-deep/40">Max 2MB</span>
      </div>

      <div className="mt-2.5">
        {state === "idle" && (
          <label className={`${inputClasses} flex cursor-pointer items-center justify-center py-2.5 text-navy-deep/50`}>
            Choose file
            <input
              ref={inputRef}
              type="file"
              accept={acceptAttrFor(kind)}
              disabled={disabled}
              className="sr-only"
              onChange={handleSelect}
            />
          </label>
        )}

        {(state === "selected" || state === "uploading") && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-navy-deep/10">
              <div
                className="h-full rounded-full bg-accent-cyan transition-all duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-navy-deep/60">
              Uploading… {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {state === "uploaded" && (
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <span aria-hidden>✓</span> Uploaded{filename ? ` — ${filename}` : ""}
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="shrink-0 text-xs font-bold uppercase tracking-wide text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        )}

        {state === "failed" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-red-600" role="alert">
              {error || "Upload failed."}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="shrink-0 text-xs font-bold uppercase tracking-wide text-accent-cyan hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}