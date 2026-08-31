import { useEffect, useRef, useState } from "react";
import FormField, { inputClasses } from "./Formfield";
import MemberDocumentUpload from "./MemberDocumentUpload";
import { members, ApiError } from "../lib/api";
import { memberDocuments } from "../lib/Documents";
import { MEMBER_DOCUMENT_TYPE_DEFS } from "../types/Document";
import type { SubmissionMember, MemberInput } from "../types/Submission";
import type { SubmissionDocument } from "../types/Document";

const MAX_CONCURRENT_UPLOADS = 3;

/**
 * Same counting-semaphore pattern as Documentsection.tsx's useUploadGate —
 * at most MAX_CONCURRENT_UPLOADS document uploads run at once across ALL
 * team members combined, so 5 members each uploading NID + Photo at once
 * never fires 10 simultaneous requests.
 */
function useUploadGate(max: number) {
  const active = useRef(0);
  const queue = useRef<Array<() => void>>([]);

  return useRef(async (fn: () => Promise<void>) => {
    if (active.current >= max) {
      await new Promise<void>((resolve) => queue.current.push(resolve));
    }
    active.current += 1;
    try {
      await fn();
    } finally {
      active.current -= 1;
      const next = queue.current.shift();
      if (next) next();
    }
  }).current;
}

type MemberDocsByType = Record<string, SubmissionDocument>;

export default function TeamMembersSection({
  applicationId,
  guestToken,
  applicantIsTeamLeader,
  applicantName,
  disabled,
}: {
  applicationId: string;
  guestToken: string | null;
  applicantIsTeamLeader: boolean;
  applicantName?: string;
  disabled?: boolean;
}) {
  const [list, setList] = useState<SubmissionMember[]>([]);
  const [memberDocs, setMemberDocs] = useState<Record<string, MemberDocsByType>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<MemberInput>({ fullName: "" });
  const [saving, setSaving] = useState(false);
  const gate = useUploadGate(MAX_CONCURRENT_UPLOADS);

  useEffect(() => {
    let cancelled = false;
    members
      .list(applicationId, guestToken)
      .then(async (r) => {
        if (cancelled) return;
        setList(r.members);
        // Load each member's existing document status in parallel so a
        // page refresh still shows "✓ Uploaded" instead of resetting to
        // "Choose file".
        const entries = await Promise.all(
          r.members.map(async (m) => {
            try {
              const { documents: docs } = await memberDocuments.list(
                applicationId,
                m.id,
                guestToken,
              );
              const byType: MemberDocsByType = {};
              for (const d of docs) byType[d.documentType] = d;
              return [m.id, byType] as const;
            } catch {
              return [m.id, {}] as const;
            }
          }),
        );
        if (cancelled) return;
        setMemberDocs(Object.fromEntries(entries));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load team members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, guestToken]);

  async function handleAdd() {
    if (!draft.fullName.trim()) return;

    // Prevent adding another team leader if applicant is already team leader
    if (applicantIsTeamLeader && draft.isTeamLeader) {
      setError("You are already the Team Leader. Only one team leader is allowed.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { member } = await members.add(applicationId, draft, guestToken);
      setList((prev) => [...prev, member]);
      setMemberDocs((prev) => ({ ...prev, [member.id]: {} }));
      setDraft({ fullName: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add team member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await members.remove(applicationId, id, guestToken);
      setList((prev) => prev.filter((m) => m.id !== id));
      setMemberDocs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove team member.");
    }
  }

  function handleMemberDocUploaded(memberId: string, documentType: string, filename: string) {
    setMemberDocs((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [documentType]: {
          ...(prev[memberId]?.[documentType] as SubmissionDocument),
          documentType: documentType as SubmissionDocument["documentType"],
          originalFilename: filename,
          uploadStatus: "UPLOADED",
        } as SubmissionDocument,
      },
    }));
  }

  function handleMemberDocRemoved(memberId: string, documentType: string) {
    setMemberDocs((prev) => {
      const byType = { ...(prev[memberId] || {}) };
      delete byType[documentType];
      return { ...prev, [memberId]: byType };
    });
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">Team Members</h2>
      <p className="text-sm text-gray-600">
        Add additional team members (up to 5 total, including you as the team leader). Each
        member needs their own NID/Passport and a photo.
      </p>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {/* Show applicant as team leader if applicable */}
      {applicantIsTeamLeader && (
        <div className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-navy-deep">
                {applicantName || "You"} <span className="text-accent-cyan">(Team Leader)</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You are the team leader for this submission. Your NID/Passport and photo are
                uploaded in the Documents section.
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-accent-cyan/20 text-xs font-bold text-accent-cyan">
              Team Leader
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {list.map((m, i) => (
            <div key={m.id} className="rounded-lg border border-navy-deep/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">
                  Team Member {String(i + 1).padStart(2, "0")}
                </p>
                <button
                  onClick={() => handleRemove(m.id)}
                  className="text-xs font-bold uppercase text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="mt-2">
                <p className="text-sm font-bold text-navy-deep">
                  {m.fullName} {m.isTeamLeader && <span className="text-accent-cyan">(Team Leader)</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {[m.position, m.email, m.phone].filter(Boolean).join(" · ")}
                </p>
                {m.applicantType === "IAB_MEMBER" && (
                  <p className="text-xs text-gray-500">
                    IEB: {m.iabMembershipNumber || "—"} ·{" "}
                    <span
                      className={
                        m.iabVerificationStatus === "VERIFIED"
                          ? "font-semibold text-emerald-600"
                          : m.iabVerificationStatus === "FAILED"
                          ? "font-semibold text-red-600"
                          : ""
                      }
                    >
                      {m.iabVerificationStatus}
                    </span>
                  </p>
                )}
                {m.applicantType === "STUDENT" && (
                  <p className="text-xs text-gray-500">
                    {m.universityName || "—"}
                    {m.universityEmail ? ` (${m.universityEmail})` : ""} ·{" "}
                    <span
                      className={
                        m.universityVerificationStatus === "VERIFIED"
                          ? "font-semibold text-emerald-600"
                          : m.universityVerificationStatus === "FAILED"
                          ? "font-semibold text-red-600"
                          : ""
                      }
                    >
                      {m.universityVerificationStatus}
                    </span>
                  </p>
                )}
              </div>

              {/* Documents — NID/Passport + Member Photo, scoped to THIS member */}
              <div className="mt-4 border-t border-navy-deep/10 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/50 mb-2">
                  Documents
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MEMBER_DOCUMENT_TYPE_DEFS.map((def) => {
                    const existing = memberDocs[m.id]?.[def.type];
                    return (
                      <MemberDocumentUpload
                        key={def.type}
                        applicationId={applicationId}
                        memberId={m.id}
                        documentType={def.type}
                        label={def.label}
                        kind={def.kind}
                        required={def.required}
                        guestToken={guestToken}
                        disabled={disabled}
                        initialStatus={existing?.uploadStatus === "UPLOADED" ? "UPLOADED" : undefined}
                        initialFilename={existing?.originalFilename}
                        concurrencyGate={gate}
                        onUploaded={(documentType, filename) =>
                          handleMemberDocUploaded(m.id, documentType, filename)
                        }
                        onRemoved={(documentType) => handleMemberDocRemoved(m.id, documentType)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {list.length < 4 && (
        <div className="rounded-lg border border-dashed border-navy-deep/20 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" required>
              <input
                className={inputClasses}
                value={draft.fullName}
                onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
              />
            </FormField>
            <FormField label="Position">
              <select
                className={inputClasses}
                value={draft.position || ""}
                onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))}
              >
                <option value="">Select position</option>
                {["1", "2", "3", "4", "5"].map((pos) => {
                  const isTaken = list.some((m) => m.position === pos);
                  return (
                    <option key={pos} value={pos} disabled={isTaken}>
                      {pos} {isTaken ? "(taken)" : ""}
                    </option>
                  );
                })}
              </select>
            </FormField>
            <FormField label="Email">
              <input
                className={inputClasses}
                value={draft.email || ""}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </FormField>
            <FormField label="Phone">
              <input
                className={inputClasses}
                value={draft.phone || ""}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </FormField>
          </div>

          <div className="flex gap-3">
            {(["IAB_MEMBER", "STUDENT"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, applicantType: type }))}
                className={[
                  "flex-1 rounded-lg border px-4 py-2 text-xs font-bold uppercase tracking-wide",
                  draft.applicantType === type
                    ? "border-navy-deep bg-navy-deep text-white"
                    : "border-navy-deep/15 text-navy-deep/70",
                ].join(" ")}
              >
                {type === "IAB_MEMBER" ? "IEB Member" : "Student"}
              </button>
            ))}
          </div>

          {draft.applicantType === "STUDENT" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="University Name">
                <input
                  className={inputClasses}
                  value={draft.universityName || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, universityName: e.target.value }))}
                />
              </FormField>
              <FormField label="University Email">
                <input
                  className={inputClasses}
                  value={draft.universityEmail || ""}
                  onChange={(e) => setDraft((d) => ({ ...d, universityEmail: e.target.value }))}
                />
              </FormField>
            </div>
          ) : draft.applicantType === "IAB_MEMBER" ? (
            <FormField label="IEB Membership Number" required>
              <input
                className={inputClasses}
                value={draft.iabMembershipNumber || ""}
                onChange={(e) => setDraft((d) => ({ ...d, iabMembershipNumber: e.target.value }))}
              />
            </FormField>
          ) : null}

          <div className="flex items-start gap-2 text-sm text-navy-deep">
            <input
              type="checkbox"
              id="isTeamLeader"
              checked={Boolean(draft.isTeamLeader)}
              onChange={(e) => setDraft((d) => ({ ...d, isTeamLeader: e.target.checked }))}
              disabled={applicantIsTeamLeader}
              className="mt-0.5 h-4 w-4 accent-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="isTeamLeader" className={applicantIsTeamLeader ? "opacity-50 cursor-not-allowed" : ""}>
              This person is the Team Leader
              {applicantIsTeamLeader && (
                <p className="text-xs text-gray-500 mt-1">
                  You are already the team leader
                </p>
              )}
            </label>
          </div>

          <button
            onClick={handleAdd}
            disabled={saving || !draft.fullName.trim()}
            className="rounded-lg bg-navy-deep px-5 py-2 text-sm font-bold uppercase text-white disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add Member"}
          </button>
          <p className="text-xs text-gray-400">
            You'll be able to upload this member's NID/Passport and photo right after adding them.
          </p>
        </div>
      )}
    </section>
  );
}