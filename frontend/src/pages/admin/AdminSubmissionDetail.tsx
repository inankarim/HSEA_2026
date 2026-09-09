import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  adminSubmissions,
  type AdminSubmissionDetail as AdminSubmissionDetailType,
  AdminApiError,
} from "../../lib/adminApi";

const REVIEW_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "FINALIST", "WINNER", "REJECTED"];

function StatusSelector({
  applicationId,
  currentStatus,
  onChanged,
}: {
  applicationId: string;
  currentStatus: string;
  onChanged: (newStatus: string) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (currentStatus === "DRAFT") {
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
        Draft — not yet submitted
      </span>
    );
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;
    setUpdating(true);
    setError(null);
    try {
      const result = await adminSubmissions.updateStatus(applicationId, newStatus);
      onChanged(result.status);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={updating}
        className="rounded-lg border border-navy-deep/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-navy-deep focus:border-accent-cyan focus:outline-none disabled:opacity-60"
      >
        {REVIEW_STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </select>
      {updating && <span className="text-xs text-gray-400">Saving…</span>}
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">{label}</dt>
      <dd className="mt-0.5 text-sm text-navy-deep break-words">{value || "—"}</dd>
    </div>
  );
}

function DocStatus({ label, doc }: { label: string; doc?: { uploadStatus: string; originalFilename: string; fileSize: number } }) {
  const uploaded = doc?.uploadStatus === "UPLOADED";
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
      <span className="text-sm text-navy-deep">{label}</span>
      {uploaded ? (
        <span className="text-xs font-semibold text-emerald-600">
          ✓ {doc!.originalFilename} ({Math.round(doc!.fileSize / 1024)} KB)
        </span>
      ) : (
        <span className="text-xs font-semibold text-red-500">✗ Missing</span>
      )}
    </div>
  );
}

const APPLICANT_DOC_TYPES = [
  "APPLICANT_NID", "APPLICANT_PHOTO", "OWNER_AUTHORIZATION",
  "DESIGN_DEMONSTRATION", "COSTING", "SUSTAINABILITY_METRICS",
  "PROJECT_DESCRIPTION", "EXECUTIVE_SUMMARY", "ARCHITECTURAL_DRAWINGS",
  "COVERING_LETTER",
];
const APPLICANT_DOC_LABELS: Record<string, string> = {
  APPLICANT_NID: "Applicant NID / Passport",
  APPLICANT_PHOTO: "Applicant Photo",
  OWNER_AUTHORIZATION: "Owner Authorization",
  DESIGN_DEMONSTRATION: "Design Demonstration",
  COSTING: "Costing",
  SUSTAINABILITY_METRICS: "Sustainability Metrics",
  PROJECT_DESCRIPTION: "Project Description",
  EXECUTIVE_SUMMARY: "Executive Summary",
  ARCHITECTURAL_DRAWINGS: "Architectural Drawings",
  COVERING_LETTER: "Covering Letter",
};

export default function AdminSubmissionDetail() {
  const { applicationId = "" } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminSubmissionDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminSubmissions
      .detail(applicationId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof AdminApiError ? err.message : "Failed to load submission.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 font-semibold">{error}</p>
        <button onClick={() => navigate("/123456789/admin")} className="text-accent-cyan font-bold uppercase text-sm">
          ← Back to list
        </button>
      </div>
    );
  }

  const { submission: s, members, documents, memberDocuments } = data;
  const docByType: Record<string, any> = {};
  for (const d of documents) docByType[d.documentType] = d;

  const memberDocsByMember: Record<string, Record<string, any>> = {};
  for (const d of memberDocuments) {
    if (!d.memberId) continue;
    memberDocsByMember[d.memberId] = memberDocsByMember[d.memberId] || {};
    memberDocsByMember[d.memberId][d.documentType] = d;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate("/123456789/admin")}
              className="text-xs font-bold uppercase tracking-wide text-accent-cyan hover:underline"
            >
              ← Back to list
            </button>
            <h1 className="mt-1 font-mono text-xl font-bold text-navy-deep">{s.application_id}</h1>
          </div>

          <div className="flex items-center gap-4">
            <StatusSelector
              applicationId={applicationId}
              currentStatus={s.status}
              onChanged={(newStatus) =>
                setData((prev) =>
                  prev ? { ...prev, submission: { ...prev.submission, status: newStatus } } : prev,
                )
              }
            />
            
            <a  href={adminSubmissions.downloadUrl(applicationId)}
              className="rounded-lg bg-navy-deep px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-deep/90"
            >
              Download Applicant Folder (.zip)
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Applicant */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">Applicant</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Status" value={s.status} />
            <Field label="Applicant Type" value={s.applicant_type === "IAB_MEMBER" ? "IEB Member" : "Student"} />
            <Field label="Full Name" value={s.full_name} />
            <Field label="Email" value={s.email} />
            <Field label="Phone" value={s.phone} />
            <Field label="Organization" value={s.organization} />
            <Field label="Designation" value={s.designation} />
            <Field label="Is Team Leader" value={s.applicant_is_team_leader ? "Yes" : "No"} />
            {s.applicant_type === "IAB_MEMBER" ? (
              <Field label="IEB Membership" value={`${s.iab_membership_number || "—"} (${s.iab_verification_status})`} />
            ) : (
              <>
                <Field label="University" value={s.university_name} />
                <Field label="University Email" value={`${s.university_email || "—"} (${s.university_verification_status})`} />
              </>
            )}
          </dl>
        </section>

        {/* Project */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">Project</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Project Name" value={s.project_name} />
            <Field label="Category" value={s.project_category} />
            <Field label="Location" value={s.project_location} />
            <Field label="Status" value={s.project_status} />
            <Field label="Lead Engineer" value={s.lead_engineer} />
            <Field label="Completion Year" value={s.completion_year} />
            <Field
              label="Google Drive URL"
              value={
                s.google_drive_url ? (
                  <a href={s.google_drive_url} target="_blank" rel="noreferrer" className="text-accent-cyan underline">
                    {s.google_drive_url}
                  </a>
                ) : null
              }
            />
          </dl>
        </section>

        {/* Client */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">Client Information</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Client Name" value={s.client_name} />
            <Field label="Address" value={s.client_address} />
            <Field label="Contact Number" value={s.client_contact_number} />
            <Field label="Email" value={s.client_email} />
          </dl>
        </section>

        {/* Text content */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">Written Content</h2>
          {[
            ["Executive Summary", s.executive_summary],
            ["Project Description", s.project_description],
            ["Design Demonstration", s.design_demonstration],
            ["Material Specifications", s.material_specifications],
            ["Construction Technology", s.construction_technology],
            ["Costing", s.costing],
            ["Covering Letter", s.covering_letter],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">{label}</p>
              <p className="mt-1 text-sm text-navy-deep whitespace-pre-wrap">
                {value || <span className="text-gray-400 italic">(none — check documents below for a PDF)</span>}
              </p>
            </div>
          ))}
        </section>

        {/* Application-wide documents */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">Documents</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {APPLICANT_DOC_TYPES.map((type) => (
              <DocStatus key={type} label={APPLICANT_DOC_LABELS[type]} doc={docByType[type]} />
            ))}
          </div>
        </section>

        {/* Team members */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
            Team Members {members.length > 0 && `(${members.length})`}
          </h2>
          {members.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">No additional team members added.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {members.map((m) => (
                <div key={m.id} className="rounded-lg border border-gray-200 p-4">
                  <p className="font-semibold text-navy-deep">
                    {m.full_name} {m.is_team_leader && <span className="text-accent-cyan">(Team Leader)</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[m.position, m.email, m.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {m.applicant_type === "IAB_MEMBER"
                      ? `IEB: ${m.iab_membership_number || "—"} (${m.iab_verification_status})`
                      : `Univ: ${m.university_name || "—"} (${m.university_verification_status})`}
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <DocStatus label="NID / Passport" doc={memberDocsByMember[m.id]?.APPLICANT_NID} />
                    <DocStatus label="Member Photo" doc={memberDocsByMember[m.id]?.APPLICANT_PHOTO} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Declarations */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">Declarations</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ["Information Confirmed", s.information_confirmed],
              ["Files Uploaded Confirmed", s.files_uploaded_confirmed],
              ["Naming Convention Confirmed", s.naming_convention_confirmed],
              ["Authenticity Confirmed", s.authenticity_confirmed],
              ["Terms Accepted", s.terms_accepted],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center gap-2">
                <span className={value ? "text-emerald-600" : "text-red-500"}>{value ? "✓" : "✗"}</span>
                <span className="text-navy-deep">{label}</span>
              </div>
            ))}
          </dl>
        </section>

        <section className="text-xs text-gray-400">
          Created: {new Date(s.created_at).toLocaleString()} · Updated: {new Date(s.updated_at).toLocaleString()} ·{" "}
          Submitted: {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "not yet (DRAFT)"}
        </section>
      </div>
    </div>
  );
}