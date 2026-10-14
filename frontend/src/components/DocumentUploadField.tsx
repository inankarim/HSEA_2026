import DocumentUpload from "./Documentupload";
import type { DocumentTypeDef, DocumentType, SubmissionDocument } from "../types/Document";

export default function DocumentUploadField({
  applicationId,
  guestToken,
  disabled,
  def,
  existingDoc,
  textValue,
  concurrencyGate,
  onUploaded,
  onRemoved,
}: {
  applicationId: string;
  guestToken?: string | null;
  disabled?: boolean;
  def: DocumentTypeDef;
  existingDoc?: SubmissionDocument;
  /** Current draft value of the linked text field, if any (costing / projectDescription). */
  textValue?: string;
  concurrencyGate: (fn: () => Promise<void>) => Promise<void>;
  onUploaded: (documentType: DocumentType, filename: string) => void;
  onRemoved: (documentType: DocumentType) => void;
}) {
  const satisfiedByText = Boolean(def.orTextField && textValue?.trim());

  return (
    <div className="flex h-full flex-col">
      <DocumentUpload
        applicationId={applicationId}
        documentType={def.type}
        label={def.label}
        kind={def.kind}
        required={def.required && !satisfiedByText}
        guestToken={guestToken}
        disabled={disabled}
        initialStatus={existingDoc?.uploadStatus === "UPLOADED" ? "UPLOADED" : undefined}
        initialFilename={existingDoc?.originalFilename}
        concurrencyGate={concurrencyGate}
        onUploaded={onUploaded}
        onRemoved={onRemoved}
      />
      {def.orTextField && (
        <p className="mt-1.5 text-[11px] text-navy-deep/40">
          {satisfiedByText
            ? "You've typed this above. Uploading a PDF here will be used instead."
            : "You can type this in the box above or upload a PDF here."}
        </p>
      )}
    </div>
  );
}