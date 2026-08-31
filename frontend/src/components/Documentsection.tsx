import DocumentUploadField from "./DocumentUploadField";
import { DOCUMENT_TYPE_DEFS, type DocumentType, type SubmissionDocument } from "../types/Document";

const SLIM_DOCUMENT_TYPES: DocumentType[] = ["SUSTAINABILITY_METRICS", "ARCHITECTURAL_DRAWINGS"];

export default function DocumentsSection({
  applicationId,
  guestToken,
  disabled,
  existing,
  loading,
  loadError,
  concurrencyGate,
  onUploaded,
  onRemoved,
}: {
  applicationId: string;
  guestToken: string | null;
  disabled?: boolean;
  existing: Record<string, SubmissionDocument>;
  loading?: boolean;
  loadError?: string | null;
  concurrencyGate: (fn: () => Promise<void>) => Promise<void>;
  onUploaded: (documentType: DocumentType, filename: string) => void;
  onRemoved: (documentType: DocumentType) => void;
}) {
  const defs = DOCUMENT_TYPE_DEFS.filter((d) => SLIM_DOCUMENT_TYPES.includes(d.type));

  if (loading) {
    return <p className="text-sm text-gray-400">Loading your documents…</p>;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">
        Supporting Documents
      </h2>
      <p className="text-sm leading-relaxed text-gray-600">
        Upload these remaining supporting documents. Each file must be under 2MB. You can
        replace a file any time before you submit.
      </p>

      {loadError && (
        <p className="text-sm font-semibold text-red-600" role="alert">
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {defs.map((def) => (
          <DocumentUploadField
            key={def.type}
            applicationId={applicationId}
            guestToken={guestToken}
            disabled={disabled}
            def={def}
            existingDoc={existing[def.type]}
            concurrencyGate={concurrencyGate}
            onUploaded={onUploaded}
            onRemoved={onRemoved}
          />
        ))}
      </div>
    </section>
  );
}