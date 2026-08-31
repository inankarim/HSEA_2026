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
    <div>
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
            ? "Satisfied by the text you entered — uploading a file here is optional and will be used instead."
            : "Optional if you've already filled in the text field above."}
        </p>
      )}
    </div>
  );
}