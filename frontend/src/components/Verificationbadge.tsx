import type { VerificationStatus } from "../types/Submission";

export default function VerificationBadge({
  status,
  verifiedLabel,
  failedLabel,
}: {
  status: VerificationStatus;
  verifiedLabel: string;
  failedLabel: string;
}) {
  if (status === "NOT_APPLICABLE") return null;

  if (status === "PENDING") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-navy-deep/50">
        <span className="h-1.5 w-1.5 rounded-full bg-navy-deep/30" />
        Not yet checked
      </p>
    );
  }

  if (status === "VERIFIED") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <span aria-hidden>✓</span> {verifiedLabel}
      </p>
    );
  }

  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600" role="alert">
      <span aria-hidden>⚠</span> {failedLabel}
    </p>
  );
}