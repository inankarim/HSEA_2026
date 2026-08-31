import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FadeIn from "../components/FadeIn";
import SubmissionProgress from "../components/SubmissionProgress";
import SaveStatus, { type SaveState } from "../components/SaveStatus";
import VerificationBadge from "../components/Verificationbadge";
import FormField, { inputClasses, textareaClasses } from "../components/Formfield";
import DocumentUploadField from "../components/DocumentUploadField";
import {
  ApiError,
  getGuestAccessToken,
  submissions,
  verification,
  members,
  newIdempotencyKey,
} from "../lib/api";
import { documents } from "../lib/Documents";
import { useUploadGate } from "../lib/useUploadGate";
import { useAuth } from "../context/AuthContext";
import {
  PROJECT_DESCRIPTION_WORD_LIMIT,
  SUBMISSION_SECTIONS,
  type SectionId,
  type Submission,
  type SubmissionDraftPatch,
  type SubmissionMember,
} from "../types/Submission";
import {
  DOCUMENT_TYPE_DEFS,
  type DocumentType,
  type SubmissionDocument,
} from "../types/Document";
import TeamMembersSection from "../components/TeamMembers";
import DocumentsSection from "../components/Documentsection";

// Mirrors utils/wordCount.js exactly — the backend remains the final authority.
function countWords(text: string | null | undefined) {
  if (!text) return 0;
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

const AUTOSAVE_DELAY_MS = 1200;
const PROJECT_CATEGORY_OPTIONS = [
  "High Performance Concrete Structure",
  "Advanced Construction Technology & Circularity",
  "Visionary Design",
] as const;
const MAX_CONCURRENT_UPLOADS = 3;

type Draft = SubmissionDraftPatch;

function draftFromSubmission(s: Submission): Draft {
  return {
    applicantType: s.applicantType,
    fullName: s.fullName ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    organization: s.organization ?? "",
    designation: s.designation ?? "",
    iabMembershipNumber: s.iabMembershipNumber ?? "",
    applicantIsTeamLeader: s.applicantIsTeamLeader,
    universityName: s.universityName ?? "",
    universityEmail: s.universityEmail ?? "",
    projectName: s.projectName ?? "",
    projectCategory: s.projectCategory ?? "",
    projectLocation: s.projectLocation ?? "",
    projectStatus: s.projectStatus ?? "",
    clientOwner: s.clientOwner ?? "",
    clientName: s.clientName ?? "",
    clientAddress: s.clientAddress ?? "",
    clientContactNumber: s.clientContactNumber ?? "",
    clientEmail: s.clientEmail ?? "",
    leadEngineer: s.leadEngineer ?? "",
    completionYear: s.completionYear ?? undefined,
    executiveSummary: s.executiveSummary ?? "",
    projectDescription: s.projectDescription ?? "",
    designDemonstration: s.designDemonstration ?? "",
    materialSpecifications: s.materialSpecifications ?? "",
    constructionTechnology: s.constructionTechnology ?? "",
    costing: s.costing ?? "",
    // NEW
    coveringLetter: s.coveringLetter ?? "",
    googleDriveUrl: s.googleDriveUrl ?? "",
    informationConfirmed: s.informationConfirmed,
    filesUploadedConfirmed: s.filesUploadedConfirmed,
    namingConventionConfirmed: s.namingConventionConfirmed,
    authenticityConfirmed: s.authenticityConfirmed,
    termsAccepted: s.termsAccepted,
  };
}

export default function SubmissionPortal() {
  const { applicationId = "" } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<SubmissionMember[]>([]);

  const [activeSection, setActiveSection] = useState<SectionId>("applicant");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [iabResult, setIabResult] = useState<null | { verified: boolean; memberName?: string }>(null);
  const [uniResult, setUniResult] = useState<null | { verified: boolean; name?: string }>(null);

  const [existingDocuments, setExistingDocuments] = useState<Record<string, SubmissionDocument>>({});
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const uploadGate = useUploadGate(MAX_CONCURRENT_UPLOADS);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Draft>({});
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const docDefByType = useMemo(() => {
    const map: Record<string, (typeof DOCUMENT_TYPE_DEFS)[number]> = {};
    for (const def of DOCUMENT_TYPE_DEFS) map[def.type] = def;
    return map;
  }, []);

  // --- load submission ------------------------------------------------

  useEffect(() => {
    // Wait for the auth check to settle first: a signed-in user's request
    // is authorized entirely by their session cookie, so we deliberately
    // avoid attaching a stale/irrelevant guest token in that case.
    if (authLoading) return;
    const token = isAuthenticated ? null : getGuestAccessToken(applicationId);
    setGuestToken(token);

    let cancelled = false;
    async function load() {
      try {
        const [{ submission: sub }, docsResult, membersResult] = await Promise.all([
          submissions.get(applicationId, token),
          documents.list(applicationId, token).catch((err) => {
            if (!cancelled) {
              setDocumentsError(
                err instanceof ApiError ? err.message : "Couldn't load your documents."
              );
            }
            return { documents: [] as SubmissionDocument[] };
          }),
          members.list(applicationId, token).catch((err) => {
            // Team members are not critical, fail silently
            console.warn("Failed to load team members:", err);
            return { members: [] as SubmissionMember[] };
          }),
        ]);
        if (cancelled) return;

        setSubmission(sub);
        setDraft(draftFromSubmission(sub));
        setTeamMembers(membersResult.members);
        if (sub.iabVerificationStatus !== "NOT_APPLICABLE") {
          setIabResult({ verified: sub.iabVerificationStatus === "VERIFIED" });
        }
        if (sub.universityVerificationStatus !== "NOT_APPLICABLE") {
          setUniResult({ verified: sub.universityVerificationStatus === "VERIFIED" });
        }

        const byType: Record<string, SubmissionDocument> = {};
        for (const d of docsResult.documents) byType[d.documentType] = d;
        setExistingDocuments(byType);
        setDocumentsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "We couldn't load this submission. Please check the link and try again."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [applicationId, authLoading, isAuthenticated]);

  // --- reload team members when navigating to review ---------------

  useEffect(() => {
    if (activeSection === "review") {
      // Reload team members when entering review section
      let cancelled = false;

      const loadTeamMembers = async () => {
        try {
          const result = await members.list(applicationId, guestToken);
          if (!cancelled) {
            setTeamMembers(result.members);
          }
        } catch (err) {
          console.warn("Failed to reload team members:", err);
          // Keep existing team members if reload fails
        }
      };

      loadTeamMembers();

      return () => {
        cancelled = true;
      };
    }
  }, [activeSection, applicationId, guestToken]);

  // --- autosave ---------------------------------------------------------

  const flushSave = useCallback(async () => {
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatch.current = {};

    setSaveState("saving");
    try {
      const { submission: updated } = await submissions.updateDraft(applicationId, patch, guestToken);
      setSubmission(updated);
      setFieldErrors({});
      setSaveState("saved");
      setLastSavedAt(new Date());
      if (patch.iabMembershipNumber !== undefined) {
        setIabResult({ verified: updated.iabVerificationStatus === "VERIFIED" });
      }
      if (patch.universityEmail !== undefined) {
        setUniResult({ verified: updated.universityVerificationStatus === "VERIFIED" });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setSaveState("offline");
      } else {
        setSaveState("error");
      }
      if (err instanceof ApiError && err.errors.length > 0) {
        const map: Record<string, string> = {};
        for (const e of err.errors) if (e.field) map[e.field] = e.message;
        setFieldErrors(map);
      }
      // Put the failed patch back so the next change or manual save retries it.
      pendingPatch.current = { ...patch, ...pendingPatch.current };
    }
  }, [applicationId, guestToken]);

  function scheduleSave(patch: Draft) {
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    scheduleSave({ [key]: value } as Draft);
  }

  function saveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    flushSave();
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // --- verification -------------------------------------------------------

  async function checkIab() {
    const number = (draft.iabMembershipNumber || "").trim();
    if (!number) return;
    try {
      const result = await verification.iab(number);
      setIabResult({ verified: result.verified, memberName: result.memberName });
    } catch {
      // Instant check failed silently — the authoritative status still
      // comes back from the draft save above.
    }
  }

  async function checkUniversityEmail() {
    const email = (draft.universityEmail || "").trim();
    if (!email) return;
    try {
      const result = await verification.universityEmail(email);
      setUniResult({ verified: result.verified, name: result.university?.name });
    } catch {
      // same as above
    }
  }

  // --- documents ------------------------------------------------------

  function handleDocUploaded(documentType: DocumentType, filename: string) {
    setExistingDocuments((prev) => ({
      ...prev,
      [documentType]: {
        ...(prev[documentType] as SubmissionDocument),
        documentType,
        originalFilename: filename,
        uploadStatus: "UPLOADED",
      } as SubmissionDocument,
    }));
  }

  function handleDocRemoved(documentType: DocumentType) {
    setExistingDocuments((prev) => {
      const next = { ...prev };
      delete next[documentType];
      return next;
    });
  }

  // --- section completeness (for the progress rail) ------------------------

  const completedSections = useMemo(() => {
    const done = new Set<SectionId>();
    if (draft.fullName && draft.email) done.add("applicant");
    if (draft.projectName && draft.projectCategory) done.add("project");
    if (draft.executiveSummary && draft.projectDescription) done.add("description");
    if (draft.designDemonstration || draft.materialSpecifications) done.add("technical");
    if (draft.googleDriveUrl) done.add("drive");
    if (
      draft.informationConfirmed &&
      draft.filesUploadedConfirmed &&
      draft.namingConventionConfirmed &&
      draft.authenticityConfirmed &&
      draft.termsAccepted
    )
      done.add("declaration");
    return done;
  }, [draft]);

  function goToSection(id: SectionId) {
    saveNow();
    setActiveSection(id);
  }

  // --- final submit -------------------------------------------------------

  async function handleFinalSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    saveNow();
    try {
      const { submission: finalized } = await submissions.submitFinal(
        applicationId,
        guestToken,
        idempotencyKeyRef.current
      );
      setSubmission(finalized);
      setConfirmOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "We couldn't complete your submission. Your information has not been lost."
      );
      // Fresh key for a genuinely new attempt after a hard failure.
      idempotencyKeyRef.current = newIdempotencyKey();
    } finally {
      setSubmitting(false);
    }
  }

  // Validates all required fields before allowing submission.
  //
  // NOTE: Executive Summary, Project Description, Design Demonstration are
  // "either/or" fields — satisfied by EITHER the text box OR an uploaded
  // PDF (see existingDocuments[...].uploadStatus). Previously this only
  // checked draft.<field>?.trim(), which wrongly blocked submission when
  // the applicant had uploaded a PDF instead of typing the text. Costing
  // and Covering Letter are fully optional-either/or (no hard requirement
  // at all) to match the backend's conditionallyRequiredDocumentTypes().
  function validateBeforeSubmit(): { valid: boolean; error?: string } {
    // Check all required applicant fields
    if (!draft.fullName?.trim()) {
      return { valid: false, error: "Please enter your full name." };
    }
    if (!draft.email?.trim()) {
      return { valid: false, error: "Please enter your email." };
    }

    // Check applicant type-specific fields
    if (draft.applicantType === "IAB_MEMBER") {
      if (!draft.iabMembershipNumber?.trim()) {
        return { valid: false, error: "Please enter your IAB membership number." };
      }
      if (iabResult?.verified === false) {
        return { valid: false, error: "IAB membership number could not be verified." };
      }
    } else {
      if (!draft.universityName?.trim()) {
        return { valid: false, error: "Please enter your university name." };
      }
      if (!draft.universityEmail?.trim()) {
        return { valid: false, error: "Please enter your university email." };
      }
    }

    // Check project fields
    if (!draft.projectName?.trim()) {
      return { valid: false, error: "Please enter your project name." };
    }
    if (!draft.projectCategory?.trim()) {
      return { valid: false, error: "Please enter your project category." };
    }

    // Check client information
    if (!draft.clientName?.trim()) {
      return { valid: false, error: "Please enter the client name." };
    }

    // Executive Summary — either text or uploaded PDF
    const hasExecutiveSummary =
      Boolean(draft.executiveSummary?.trim()) ||
      existingDocuments.EXECUTIVE_SUMMARY?.uploadStatus === "UPLOADED";
    if (!hasExecutiveSummary) {
      return {
        valid: false,
        error: "Please provide an executive summary — as text or an uploaded PDF.",
      };
    }

    // Project Description — either text or uploaded PDF
    const hasProjectDescription =
      Boolean(draft.projectDescription?.trim()) ||
      existingDocuments.PROJECT_DESCRIPTION?.uploadStatus === "UPLOADED";
    if (!hasProjectDescription) {
      return {
        valid: false,
        error: "Please provide a project description — as text or an uploaded PDF.",
      };
    }
    if (
      draft.projectDescription?.trim() &&
      countWords(draft.projectDescription) > PROJECT_DESCRIPTION_WORD_LIMIT
    ) {
      return {
        valid: false,
        error: `Project description exceeds ${PROJECT_DESCRIPTION_WORD_LIMIT} words.`,
      };
    }

    // Design Demonstration — either text or uploaded PDF
    const hasDesignDemonstration =
      Boolean(draft.designDemonstration?.trim()) ||
      existingDocuments.DESIGN_DEMONSTRATION?.uploadStatus === "UPLOADED";
    if (!hasDesignDemonstration) {
      return {
        valid: false,
        error: "Please provide a design demonstration — as text or an uploaded PDF.",
      };
    }

    // Costing and Covering Letter are fully optional — no check here,
    // matching conditionallyRequiredDocumentTypes() on the backend not
    // being enforced as hard-required in REQUIRED_COMMON_FIELDS.
    // (If you want Costing/Covering Letter to be mandatory-either-or too,
    // add the same either/or check pattern used above.)

    // Check Google Drive URL
    if (!draft.googleDriveUrl?.trim()) {
      return { valid: false, error: "Please provide a Google Drive folder link." };
    }

    // Check all declarations
    if (!draft.informationConfirmed) {
      return { valid: false, error: "Please confirm your information is accurate." };
    }
    if (!draft.filesUploadedConfirmed) {
      return { valid: false, error: "Please confirm all files are uploaded." };
    }
    if (!draft.namingConventionConfirmed) {
      return { valid: false, error: "Please confirm files follow naming convention." };
    }
    if (!draft.authenticityConfirmed) {
      return { valid: false, error: "Please confirm the work is authentic." };
    }
    if (!draft.termsAccepted) {
      return { valid: false, error: "Please accept the terms and conditions." };
    }

    return { valid: true };
  }

  // --- render: loading / error states -------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm font-semibold uppercase tracking-wide text-navy-deep/50">
          Loading your submission…
        </p>
      </div>
    );
  }

  if (loadError || !submission) {
    return (
      <div className="min-h-screen bg-white">
        <div className="brand-surface">
          <Header />
        </div>
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-xl font-bold text-navy-deep">We couldn't open this submission</h1>
          <p className="mt-3 text-sm text-gray-600">{loadError}</p>
          <button
            onClick={() => navigate("/submit")}
            className="mt-6 rounded-lg bg-navy-deep px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white"
          >
            Back to instructions
          </button>
        </div>
      </div>
    );
  }

  if (submission.status !== "DRAFT") {
    return (
      <div className="min-h-screen bg-white">
        <div className="brand-surface">
          <Header />
        </div>
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <FadeIn>
            <span className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">
              Submission Received
            </span>
            <h1 className="mt-4 text-3xl font-bold text-navy-deep">
              Your HSEA 2026 submission has been successfully received.
            </h1>
            <p className="mt-6 text-xs font-bold uppercase tracking-wide text-navy-deep/50">
              Application ID
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-navy-deep">
              {submission.applicationId}
            </p>
            {submission.projectName && (
              <p className="mt-4 text-sm text-gray-600">{submission.projectName}</p>
            )}
            {submission.submittedAt && (
              <p className="mt-1 text-xs text-gray-400">
                Submitted {new Date(submission.submittedAt).toLocaleString()}
              </p>
            )}
            <p className="mt-8 text-sm text-gray-500">
              Please keep this Application ID for your records.
            </p>
          </FadeIn>
        </div>
        <Footer />
      </div>
    );
  }

  const isIabApplicant = draft.applicantType === "IAB_MEMBER";

  return (
    <div className="min-h-screen bg-white">
      <div className="brand-surface">
        <Header />
      </div>

      {/* Portal header */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">Application</p>
            <p className="font-mono text-xl font-bold text-navy-deep">{submission.applicationId}</p>
          </div>
          <div className="flex items-center gap-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-deep/50">
              {isAuthenticated && user ? `Signed in as ${user.fullName}` : "Guest session"}
            </p>
            <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <SubmissionProgress
          activeSection={activeSection}
          completedSections={completedSections}
          onSelect={goToSection}
        />

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* 01 Applicant */}

              {activeSection === "applicant" && (
                <section className="space-y-6">
                  <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">Applicant</h2>

                  <FormField label="Applicant Type" required>
                    <div className="flex gap-3">
                      {(["IAB_MEMBER", "STUDENT"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => update("applicantType", type)}
                          className={[
                            "flex-1 rounded-lg border px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors",
                            draft.applicantType === type
                              ? "border-navy-deep bg-navy-deep text-white"
                              : "border-navy-deep/15 text-navy-deep/70 hover:border-navy-deep/40",
                          ].join(" ")}
                        >
                          {type === "IAB_MEMBER" ? "IEB Member" : "Student"}
                        </button>
                      ))}
                      <label className="flex items-center gap-2 text-sm text-navy-deep">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.applicantIsTeamLeader)}
                          onChange={(e) => update("applicantIsTeamLeader", e.target.checked)}
                          className="h-4 w-4 accent-accent-cyan"
                        />
                        I am the Team Leader
                      </label>
                    </div>
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Full Name" required error={fieldErrors.fullName}>
                      <input
                        className={inputClasses}
                        value={draft.fullName || ""}
                        onChange={(e) => update("fullName", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Email" required error={fieldErrors.email}>
                      <input
                        type="email"
                        className={inputClasses}
                        value={draft.email || ""}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Phone">
                      <input
                        className={inputClasses}
                        value={draft.phone || ""}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Organization">
                      <input
                        className={inputClasses}
                        value={draft.organization || ""}
                        onChange={(e) => update("organization", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Designation">
                      <input
                        className={inputClasses}
                        value={draft.designation || ""}
                        onChange={(e) => update("designation", e.target.value)}
                      />
                    </FormField>
                  </div>

                  {isIabApplicant ? (
                    <FormField label="IEB Membership Number" required error={fieldErrors.iabMembershipNumber}>
                      <input
                        className={inputClasses}
                        value={draft.iabMembershipNumber || ""}
                        onChange={(e) => update("iabMembershipNumber", e.target.value)}
                        onBlur={checkIab}
                      />
                      {iabResult && (
                        <VerificationBadge
                          status={iabResult.verified ? "VERIFIED" : "FAILED"}
                          verifiedLabel={
                            iabResult.memberName
                              ? `IEB membership verified — ${iabResult.memberName}`
                              : "IEB membership verified"
                          }
                          failedLabel="We could not verify this IEB membership number. Please check the number and try again."
                        />
                      )}
                    </FormField>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FormField label="University Name" required error={fieldErrors.universityName}>
                        <input
                          className={inputClasses}
                          value={draft.universityName || ""}
                          onChange={(e) => update("universityName", e.target.value)}
                        />
                      </FormField>
                      <FormField label="University Email" required error={fieldErrors.universityEmail}>
                        <input
                          type="email"
                          className={inputClasses}
                          value={draft.universityEmail || ""}
                          onChange={(e) => update("universityEmail", e.target.value)}
                          onBlur={checkUniversityEmail}
                        />
                        {uniResult && (
                          <VerificationBadge
                            status={uniResult.verified ? "VERIFIED" : "FAILED"}
                            verifiedLabel={
                              uniResult.name
                                ? `University email verified — ${uniResult.name}`
                                : "University email verified"
                            }
                            failedLabel="This university email domain could not be verified. Please check your email or contact the competition team."
                          />
                        )}
                      </FormField>
                    </div>
                  )}

                  <h3 className="mt-2 text-sm font-bold uppercase tracking-wide text-navy-deep/60">
                    Identification
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DocumentUploadField
                      applicationId={submission.applicationId}
                      guestToken={guestToken}
                      def={docDefByType.APPLICANT_NID}
                      existingDoc={existingDocuments.APPLICANT_NID}
                      concurrencyGate={uploadGate}
                      onUploaded={handleDocUploaded}
                      onRemoved={handleDocRemoved}
                    />
                    <DocumentUploadField
                      applicationId={submission.applicationId}
                      guestToken={guestToken}
                      def={docDefByType.APPLICANT_PHOTO}
                      existingDoc={existingDocuments.APPLICANT_PHOTO}
                      concurrencyGate={uploadGate}
                      onUploaded={handleDocUploaded}
                      onRemoved={handleDocRemoved}
                    />
                  </div>
                </section>
              )}
              {activeSection === "team" && (
                <TeamMembersSection
                  applicationId={submission.applicationId}
                  guestToken={guestToken}
                  applicantIsTeamLeader={Boolean(draft.applicantIsTeamLeader)}
                  applicantName={draft.fullName}
                />
              )}

              {activeSection === "project" && (
                <section className="space-y-6">
                  <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">Project</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Project Name" required error={fieldErrors.projectName}>
                      <input className={inputClasses} value={draft.projectName || ""} onChange={(e) => update("projectName", e.target.value)} />
                    </FormField>
                    <FormField label="Project Category" required error={fieldErrors.projectCategory}>
                      <select
                        className={inputClasses}
                        value={draft.projectCategory || ""}
                        onChange={(e) => update("projectCategory", e.target.value)}
                      >
                        <option value="" disabled>
                          Select a category
                        </option>
                        {PROJECT_CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Project Location">
                      <input className={inputClasses} value={draft.projectLocation || ""} onChange={(e) => update("projectLocation", e.target.value)} />
                    </FormField>
                    <FormField label="Project Status">
                      <input className={inputClasses} value={draft.projectStatus || ""} onChange={(e) => update("projectStatus", e.target.value)} placeholder="e.g. Completed, Under Construction" />
                    </FormField>
                    <FormField label="Client Project / Own Project">
                      <input className={inputClasses} value={draft.clientOwner || ""} onChange={(e) => update("clientOwner", e.target.value)} />
                    </FormField>
                    <FormField label="Lead Engineer">
                      <input className={inputClasses} value={draft.leadEngineer || ""} onChange={(e) => update("leadEngineer", e.target.value)} />
                    </FormField>
                    <FormField label="Completion Year">
                      <input type="number" className={inputClasses} value={draft.completionYear ?? ""} onChange={(e) => update("completionYear", e.target.value ? Number(e.target.value) : undefined)} />
                    </FormField>
                  </div>

                  {/* Sibling of the fields grid, not nested inside it — spans full width */}
                  <h3 className="mt-2 text-sm font-bold uppercase tracking-wide text-navy-deep/60">
                    Client Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Client Name" required error={fieldErrors.clientName}>
                      <input className={inputClasses} value={draft.clientName || ""} onChange={(e) => update("clientName", e.target.value)} />
                    </FormField>
                    <FormField label="Contact Number">
                      <input className={inputClasses} value={draft.clientContactNumber || ""} onChange={(e) => update("clientContactNumber", e.target.value)} />
                    </FormField>
                    <FormField label="Email">
                      <input type="email" className={inputClasses} value={draft.clientEmail || ""} onChange={(e) => update("clientEmail", e.target.value)} />
                    </FormField>
                    <FormField label="Address">
                      <input className={inputClasses} value={draft.clientAddress || ""} onChange={(e) => update("clientAddress", e.target.value)} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <DocumentUploadField
                      applicationId={submission.applicationId}
                      guestToken={guestToken}
                      def={docDefByType.OWNER_AUTHORIZATION}
                      existingDoc={existingDocuments.OWNER_AUTHORIZATION}
                      concurrencyGate={uploadGate}
                      onUploaded={handleDocUploaded}
                      onRemoved={handleDocRemoved}
                    />
                  </div>
                </section>
              )}

              {/* 03 Project Description */}
              {activeSection === "description" && (
                <section className="space-y-6">
                  <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">
                    Project Description
                  </h2>

                  <FormField label="Executive Summary" hint="1 page">
                    <textarea
                      className={textareaClasses}
                      value={draft.executiveSummary || ""}
                      onChange={(e) => update("executiveSummary", e.target.value)}
                    />
                  </FormField>
                  <DocumentUploadField
                    applicationId={submission.applicationId}
                    guestToken={guestToken}
                    def={docDefByType.EXECUTIVE_SUMMARY}
                    existingDoc={existingDocuments.EXECUTIVE_SUMMARY}
                    textValue={draft.executiveSummary}
                    concurrencyGate={uploadGate}
                    onUploaded={handleDocUploaded}
                    onRemoved={handleDocRemoved}
                  />

                  <FormField
                    label="Project Description"
                    error={fieldErrors.projectDescription}
                    hint={`${countWords(draft.projectDescription)} / ${PROJECT_DESCRIPTION_WORD_LIMIT} words`}
                  >
                    <textarea
                      className={textareaClasses}
                      value={draft.projectDescription || ""}
                      onChange={(e) => update("projectDescription", e.target.value)}
                    />
                    {countWords(draft.projectDescription) > PROJECT_DESCRIPTION_WORD_LIMIT && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600">
                        Project description must not exceed {PROJECT_DESCRIPTION_WORD_LIMIT} words.
                      </p>
                    )}
                  </FormField>
                  <DocumentUploadField
                    applicationId={submission.applicationId}
                    guestToken={guestToken}
                    def={docDefByType.PROJECT_DESCRIPTION}
                    existingDoc={existingDocuments.PROJECT_DESCRIPTION}
                    textValue={draft.projectDescription}
                    concurrencyGate={uploadGate}
                    onUploaded={handleDocUploaded}
                    onRemoved={handleDocRemoved}
                  />

                  {/* MOVED HERE — Covering Letter, same either/or pattern as Costing */}
                  <FormField label="Covering Letter">
                    <textarea
                      className={textareaClasses}
                      value={draft.coveringLetter || ""}
                      onChange={(e) => update("coveringLetter", e.target.value)}
                    />
                  </FormField>
                  <DocumentUploadField
                    applicationId={submission.applicationId}
                    guestToken={guestToken}
                    def={docDefByType.COVERING_LETTER}
                    existingDoc={existingDocuments.COVERING_LETTER}
                    textValue={draft.coveringLetter}
                    concurrencyGate={uploadGate}
                    onUploaded={handleDocUploaded}
                    onRemoved={handleDocRemoved}
                  />
                </section>
              )}

              {/* 04 Technical Information */}
              {activeSection === "technical" && (
                <section className="space-y-6">
                  <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">
                    Technical Information
                  </h2>

                  <FormField label="Design Demonstration" hint="max 5 pages">
                    <textarea
                      className={textareaClasses}
                      value={draft.designDemonstration || ""}
                      onChange={(e) => update("designDemonstration", e.target.value)}
                    />
                  </FormField>
                  <DocumentUploadField
                    applicationId={submission.applicationId}
                    guestToken={guestToken}
                    def={docDefByType.DESIGN_DEMONSTRATION}
                    existingDoc={existingDocuments.DESIGN_DEMONSTRATION}
                    textValue={draft.designDemonstration}
                    concurrencyGate={uploadGate}
                    onUploaded={handleDocUploaded}
                    onRemoved={handleDocRemoved}
                  />

                  <FormField label="Material Specifications">
                    <textarea
                      className={textareaClasses}
                      value={draft.materialSpecifications || ""}
                      onChange={(e) => update("materialSpecifications", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Construction Technology">
                    <textarea
                      className={textareaClasses}
                      value={draft.constructionTechnology || ""}
                      onChange={(e) => update("constructionTechnology", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Costing" hint="required where applicable, particularly for low-cost design solutions">
                    <textarea
                      className={textareaClasses}
                      value={draft.costing || ""}
                      onChange={(e) => update("costing", e.target.value)}
                    />
                  </FormField>
                  <DocumentUploadField
                    applicationId={submission.applicationId}
                    guestToken={guestToken}
                    def={docDefByType.COSTING}
                    existingDoc={existingDocuments.COSTING}
                    textValue={draft.costing}
                    concurrencyGate={uploadGate}
                    onUploaded={handleDocUploaded}
                    onRemoved={handleDocRemoved}
                  />
                </section>
              )}

           {/* 05 Google Drive */}
           {activeSection === "drive" && (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">
                  Your Project Files
                </h2>
                <p className="text-sm leading-relaxed text-gray-600">
                  Your project files are not uploaded to this website. Upload all required
                  files to your own Google Drive folder, organize them according to the
                  naming convention, and paste the shared folder link below.
                </p>

                {/* ⚠️ CRITICAL WARNING BANNER */}
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6">
                  <div className="flex gap-4">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white font-bold">
                      ⚠️
                    </div>
                    <div>
                      <h3 className="font-bold uppercase tracking-wide text-amber-900">
                        IMPORTANT: Keep Your Folder Accessible
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-amber-800">
                        The jury panel will need to <strong>access and view all files</strong> in your Google Drive folder during the review process. <strong>If your folder is not shared or accessible</strong>, your submission <strong>will be automatically rejected</strong>.
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-amber-800">
                        <li>✓ Keep the folder shared for the entire review period</li>
                        <li>✓ Ensure the link works and is publicly viewable</li>
                        <li>✗ Do NOT update or modify any files after submission — automatic desk rejection</li>
                        <li>✗ Do NOT add or remove files — automatic desk rejection</li>
                        <li>✗ Do NOT archive or restrict access — automatic desk rejection</li>
                        <li>✗ Do NOT revoke sharing permissions — automatic desk rejection</li>
                        <li>⚠️ <strong>FREEZE POLICY:</strong> Keep folder exactly as submitted for entire 90-day review period</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* WHAT TO UPLOAD SECTION */}
                <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-5">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
                    What to Upload to Your Google Drive Folder
                  </h4>
                  <p className="text-xs text-navy-deep/60 leading-relaxed">
                    Your Google Drive folder must contain the following project files:
                  </p>
                  <ul className="space-y-2 text-sm text-navy-deep">
                    <li className="flex items-start gap-2">
                      <span className="text-accent-cyan font-bold">•</span>
                      <span><strong>Project Photographs</strong> — High-quality images of the completed project</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent-cyan font-bold">•</span>
                      <span><strong>Structural Drawings</strong> — Technical drawings and plans</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent-cyan font-bold">•</span>
                      <span><strong>CAD Files</strong> — AutoCAD or other CAD software files (.dwg, .dxf, .rvt, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent-cyan font-bold">•</span>
                      <span><strong>CDR Files</strong> — CorelDRAW design files (.cdr)</span>
                    </li>
                  </ul>
                  <p className="text-xs text-navy-deep/60 leading-relaxed mt-3">
                    Follow the naming convention shown below when saving files to your folder.
                  </p>
                </div>

                <FormField
                  label="Google Drive Folder Link"
                  required
                  error={fieldErrors.googleDriveUrl}
                >
                  <input
                    className={inputClasses}
                    value={draft.googleDriveUrl || ""}
                    onChange={(e) => update("googleDriveUrl", e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                </FormField>

                <div className="rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
                  <p className="font-bold uppercase tracking-wide text-xs text-navy-deep/60">
                    Folder name
                  </p>
                  <p className="mt-1 font-mono text-navy-deep">
                    {submission.applicationId} - {draft.projectName || "Your Project Name"}
                  </p>
                  <p className="mt-4 font-bold uppercase tracking-wide text-xs text-navy-deep/60">
                    Files should follow
                  </p>
                  <p className="mt-1 font-mono text-navy-deep">
                    {submission.applicationId}_[Document Type].[extension]
                  </p>
                </div>

                {/* ADDITIONAL SHARING INSTRUCTIONS */}
                <div className="space-y-3 rounded-lg border border-navy-deep/10 bg-white p-5">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-navy-deep/60">
                    How to Share Your Folder
                  </h4>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li>
                      <span className="font-semibold">1. Right-click</span> your Google Drive folder → Select <span className="font-mono bg-gray-100 px-2 py-0.5">Share</span>
                    </li>
                    <li>
                      <span className="font-semibold">2. Set permission to</span> <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-blue-700 font-semibold">Viewer (anyone with link)</span>
                    </li>
                    <li>
                      <span className="font-semibold">3. Copy the link</span> and paste it above
                    </li>
                    <li>
                      <span className="font-semibold">4. Test the link</span> in an incognito window to confirm it's accessible
                    </li>
                    <li>
                      <span className="font-semibold">5. Keep it shared</span> through the entire review period (typically 2-3 months after submission)
                    </li>
                  </ol>
                </div>
              </section>
            )}

              {/* 06 Documents */}
              {activeSection === "documents" && (
                <DocumentsSection
                  applicationId={submission.applicationId}
                  guestToken={guestToken}
                  existing={existingDocuments}
                  loading={documentsLoading}
                  loadError={documentsError}
                  concurrencyGate={uploadGate}
                  onUploaded={handleDocUploaded}
                  onRemoved={handleDocRemoved}
                />
              )}
              {activeSection === "declaration" && (
                <section className="space-y-6">
                  <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">
                    Declaration &amp; Terms
                  </h2>

                  {/* Statement of Accuracy */}
                  <div className="rounded-xl border border-navy-deep/10 bg-navy-deep/5 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
                      1. Statement of Accuracy
                    </h3>
                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">
                      <p>
                        By signing below, the entrant(s) certify that all information provided in this Entry
                        Submission Form is complete, accurate, and true. The entrant(s) agree to hold harmless the
                        Holcim Award Authority, LafargeHolcim Bangladesh PLC, the Award Secretariat, and
                        associated organizing entities against any losses, damages, or liabilities arising from the use
                        of the submitted materials. The entrant retains sole responsibility for any errors, omissions, or
                        misrepresentations.
                      </p>
                    </div>
                  </div>

                  {/* Conditions of Entry */}
                  <div className="rounded-xl border border-navy-deep/10 bg-navy-deep/5 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
                      2. Conditions of Entry
                    </h3>
                    <div className="mt-3 space-y-4 text-sm leading-relaxed text-gray-700">
                      <div>
                        <p className="font-semibold text-navy-deep">Compliance</p>
                        <p className="mt-1">
                          By submitting this form, the entrant(s) agree to strictly abide by the official
                          Terms and Conditions, eligibility criteria, and participation guidelines of the Holcim
                          Structural Excellence Award.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-navy-deep">Intellectual Property &amp; Copyright</p>
                        <p className="mt-1">
                          Entrants confirm that all structural designs, engineering analysis, calculations, and submitted media fulfill copyright obligations.
                          Entrants agree to indemnify the Award Authority against any legal claims or disputes
                          regarding ownership or copyright infringement.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-navy-deep">Media &amp; Publication Rights</p>
                        <p className="mt-1">
                          Entrants grant the Award Authority and LafargeHolcim full authorization to use submitted engineering drawings, calculation summaries,
                          photographs, text, and supporting documents for publications, exhibitions, promotional
                          campaigns, technical documentation, and digital media.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-navy-deep">Right of Rejection</p>
                        <p className="mt-1">
                          The Award Authority reserves the right to reclassify, reject, or
                          disqualify any submission that fails to meet eligibility rules, contains unverifiable or
                          misleading information, or violates the professional standards of the award.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-navy-deep">Revocation of Award</p>
                        <p className="mt-1">
                          The Award Authority reserves the right to revoke any conferred
                          award or recognition if submitted information is later found to be fraudulent or if the
                          project becomes subject to legal or professional malpractice disputes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Engineering Declaration */}
                  <div className="rounded-xl border border-navy-deep/10 bg-navy-deep/5 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
                      3. Engineering Declaration
                    </h3>
                    <div className="mt-3 space-y-4 text-sm leading-relaxed text-gray-700">
                      <p>
                        I/We solemnly declare that I am / we are the Lead Structural Engineer(s) / Author(s) of the
                        submitted engineering project, and all details provided in this submission are accurate and
                        authentic.
                      </p>
                      <div>
                        <p className="font-semibold text-navy-deep">Originality</p>
                        <p className="mt-1">
                          The project represents our original structural design work and is submitted
                          with full authorization from all relevant collaborators, engineering firms, and project owners.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-navy-deep">Completion &amp; Compliance</p>
                        <p className="mt-1">
                          The project has been fully completed and complies with all
                          applicable building codes, structural safety standards, and award criteria.
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-navy-deep">Finality of Jury Decision</p>
                        <p className="mt-1">
                          I/We acknowledge and agree that the decision of the Jury Panel is final, binding, and not subject to appeal.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Checkboxes */}
                  <div className="space-y-4 border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
                      Confirm Your Agreement
                    </h3>
                    {(
                      [
                        ["informationConfirmed", "I confirm that the information provided is accurate."],
                        [
                          "filesUploadedConfirmed",
                          "I confirm that I have uploaded all required files to my Google Drive.",
                        ],
                        [
                          "namingConventionConfirmed",
                          "I confirm that the files follow the required naming convention.",
                        ],
                        [
                          "authenticityConfirmed",
                          "I confirm that the submitted work and information are authentic.",
                        ],
                        ["termsAccepted", "I agree to the competition terms, conditions, and engineering declaration above."],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-start gap-3 rounded-lg border border-navy-deep/10 p-4 text-sm text-navy-deep cursor-pointer transition-colors hover:bg-navy-deep/5 hover:border-accent-cyan/50"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(draft[key])}
                          onChange={(e) => update(key, e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-accent-cyan flex-shrink-0"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {/* 07 Review & Submit */}
              {activeSection === "review" && (
                <section className="space-y-8">
                  <h2 className="text-2xl font-bold uppercase tracking-wide text-navy-deep">
                    Review &amp; Submit
                  </h2>

                  {[
                    {
                      id: "applicant" as SectionId,
                      title: "Applicant",
                      rows: [
                        ["Name", draft.fullName],
                        ["Email", draft.email],
                        isIabApplicant
                          ? ["IEB Membership", draft.iabMembershipNumber]
                          : ["University", `${draft.universityName || ""} (${draft.universityEmail || ""})`],
                      ],
                    },
                    {
                      id: "project" as SectionId,
                      title: "Project",
                      rows: [
                        ["Project Name", draft.projectName],
                        ["Category", draft.projectCategory],
                        ["Location", draft.projectLocation],
                      ],
                    },
                   {
                      id: "team" as SectionId,
                      title: "Team Members",
                      rows: [
                        ...(() => {
                          const usedPositions = new Set(teamMembers.map((m) => m.position).filter(Boolean));
                          const applicantPosition = draft.applicantIsTeamLeader
                            ? undefined
                            : ["1", "2", "3", "4"].find((p) => !usedPositions.has(p));
                          const applicantEntry = {
                            fullName: draft.fullName || "",
                            email: draft.email || "",
                            isTeamLeader: Boolean(draft.applicantIsTeamLeader),
                            position: applicantPosition,
                          };
                          return [applicantEntry, ...teamMembers]
                            .sort((a, b) => {
                              if (a.isTeamLeader && !b.isTeamLeader) return -1;
                              if (b.isTeamLeader && !a.isTeamLeader) return 1;
                              const posA = parseInt(a.position || "0", 10);
                              const posB = parseInt(b.position || "0", 10);
                              return posA - posB;
                            })
                            .map((m) => [
                              `${m.fullName}${
                                m.isTeamLeader
                                  ? " (Team Leader)"
                                  : m.position
                                  ? ` - Position ${m.position}`
                                  : ""
                              }`,
                              m.email || "—",
                            ]);
                        })(),
                      ],
                    },
                    {
                      id: "drive" as SectionId,
                      title: "Google Drive",
                      rows: [["Folder Link", draft.googleDriveUrl]],
                    },
                    {
                      id: "declaration" as SectionId,
                      title: "Declarations",
                      rows: [
                        [
                          "Confirmed",
                          [
                            draft.informationConfirmed,
                            draft.filesUploadedConfirmed,
                            draft.namingConventionConfirmed,
                            draft.authenticityConfirmed,
                            draft.termsAccepted,
                          ].every(Boolean)
                            ? "All declarations confirmed"
                            : "Some declarations are missing",
                        ],
                      ],
                    },
                  ].map((block) => (
                    <div key={block.title} className="rounded-xl border border-navy-deep/10 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
                          {block.title}
                        </h3>
                        <button
                          onClick={() => goToSection(block.id)}
                          className="text-xs font-bold uppercase tracking-wide text-accent-cyan hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                      <dl className="mt-3 space-y-1.5">
                        {block.rows.map(([label, value]) => (
                          <div key={label} className="flex gap-2 text-sm">
                            <dt className="w-32 shrink-0 text-gray-400">{label}</dt>
                            <dd className="text-navy-deep break-words">{value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}

                  {submitError && (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
                      <p className="font-bold">We couldn't complete your submission.</p>
                      <p className="mt-1">{submitError}</p>
                      <p className="mt-1 text-red-600/80">
                        Your information has not been lost. Please review the highlighted items and try again.
                      </p>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const validation = validateBeforeSubmit();
                      if (!validation.valid) {
                        setSubmitError(validation.error || "Please complete all required fields.");
                        return;
                      }
                      setConfirmOpen(true);
                    }}
                    className="w-full rounded-lg bg-navy-deep py-3.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-deep/90"
                  >
                    Submit Application
                  </motion.button>
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Section nav footer */}
          {activeSection !== "review" && (
            <div className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6">
              <button onClick={saveNow} className="text-xs font-bold uppercase tracking-wide text-navy-deep/60 hover:text-navy-deep">
                Save Draft
              </button>
              <button
                onClick={() => {
                  const idx = SUBMISSION_SECTIONS.findIndex((s) => s.id === activeSection);
                  const next = SUBMISSION_SECTIONS[Math.min(idx + 1, SUBMISSION_SECTIONS.length - 1)];
                  goToSection(next.id);
                }}
                className="rounded-lg bg-navy-deep px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-deep/90"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm final submission dialog */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/60 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6"
              role="dialog"
              aria-modal="true"
            >
              <h3 className="text-lg font-bold text-navy-deep">Submit this application?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Once submitted, you won't be able to edit your application. Make sure everything
                is correct.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 rounded-lg border border-navy-deep/15 py-2.5 text-sm font-bold uppercase tracking-wide text-navy-deep/70"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-navy-deep py-2.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Confirm & Submit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}