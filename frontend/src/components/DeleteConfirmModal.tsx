import { useState } from "react";

export default function DeleteConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  onConfirm: (code: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!code.trim()) {
      setError("Enter the confirmation code.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/60 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="text-lg font-bold text-navy-deep">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        <input
          type="password"
          placeholder="Confirmation code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-4 w-full rounded-lg border border-navy-deep/15 px-3 py-2.5 text-sm focus:border-accent-cyan focus:outline-none"
        />
        {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-lg border border-navy-deep/15 py-2.5 text-sm font-bold uppercase tracking-wide text-navy-deep/70"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
          >
            {submitting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}