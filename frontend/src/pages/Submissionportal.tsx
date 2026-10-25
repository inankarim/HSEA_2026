import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FadeIn from "../components/FadeIn";
import SubmissionProgress from "../components/SubmissionProgress";
import SaveStatus, { SaveProblemBanner, type SaveState } from "../components/SaveStatus";
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
import { trackPixelEvent } from "../lib/pixel";
import { trackGaEvent } from "../lib/ga";
import { NAME_PATTERN, NAME_TITLE, LIMITS, PROJECT_STATUS_COMPLETED, PROJECT_STATUS_OPTIONS, COMPLETION_YEAR_RULE_CATEGORIES, completionYearRange, BD_PHONE_PATTERN, BD_PHONE_TITLE, BD_PHONE_PLACEHOLDER } from "../lib/validation";
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
const EMAIL_FIELDS = new Set<string>(["email", "universityEmail", "clientEmail"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const [uniResult, setUniResult] = useState<null | { verified: boolean; name?: string }>(null);

  const [existingDocuments, setExistingDocuments] = useState<Record<string, SubmissionDocument>>({});
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const uploadGate = useUploadGate(MAX_CONCURRENT_UPLOADS);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitIssues, setSubmitIssues] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Gates the draft form behind a one-time data-usage acknowledgment each
  // time this page loads — resets naturally on navigation/reload, doesn't
  // need to persist beyond the current visit.
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Draft>({});
  // Email fields currently holding an incomplete address; kept out of autosave
  // so they can't block the rest of the draft from saving.
  const invalidEmailFields = useRef<Set<string>>(new Set());
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
    const token = getGuestAccessToken(applicationId);  // Always check for guest token
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

  const flushSaveOnce = useCallback(async () => {
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatch.current = {};

    setSaveState("saving");
    try {
      const { submission: updated } = await submissions.updateDraft(applicationId, patch, guestToken);
      setSubmission(updated);
      setFieldErrors((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k]) => invalidEmailFields.current.has(k))),
      );
      setSaveState("saved");
      setLastSavedAt(new Date());
      if (patch.universityEmail !== undefined) {
        setUniResult({ verified: updated.universityVerificationStatus === "VERIFIED" });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setSaveState("offline");
      } else if (err instanceof ApiError && err.status === 401) {
        setSaveState("expired");
      } else {
        setSaveState("error");
      }
      const retry: Draft = { ...patch };
      if (err instanceof ApiError && err.errors.length > 0) {
        const map: Record<string, string> = {};
        for (const e of err.errors) {
          if (!e.field) continue;
          map[e.field] = e.message;
          // The backend's email check is stricter than ours: treat a rejected
          // email like one we caught ourselves, so it stops blocking autosave.
          if (EMAIL_FIELDS.has(e.field)) {
            invalidEmailFields.current.add(e.field);
            delete retry[e.field as keyof Draft];
          }
        }
        setFieldErrors(map);
      }
      // Put the failed patch back so the next change or manual save retries it.
      pendingPatch.current = { ...retry, ...pendingPatch.current };
    }
  }, [applicationId, guestToken]);

  // Saves run one after another, and final submit waits for the chain, so a
  // submission never reaches the server before the latest changes (such as
  // just-ticked declarations) have been saved.
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const flushSave = useCallback(() => {
    const run = saveChain.current.then(() => flushSaveOnce());
    saveChain.current = run;
    return run;
  }, [flushSaveOnce]);

  // While saving is failing, keep retrying in the background.
  useEffect(() => {
    if (saveState !== "error" && saveState !== "offline") return;
    const timer = setInterval(() => flushSave(), 15_000);
    return () => clearInterval(timer);
  }, [saveState, flushSave]);

  function scheduleSave(patch: Draft) {
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));

    if (EMAIL_FIELDS.has(key)) {
      const typed = typeof value === "string" ? value.trim() : "";
      if (typed && !EMAIL_REGEX.test(typed)) {
        invalidEmailFields.current.add(key);
        delete pendingPatch.current[key];
        setFieldErrors((prev) => ({ ...prev, [key]: "Enter a valid email address." }));
        return;
      }
      invalidEmailFields.current.delete(key);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }

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

  const applicantTypeDetails =
    draft.applicantType === "IAB_MEMBER"
      ? Boolean(draft.iabMembershipNumber?.trim())
      : Boolean(draft.universityName?.trim() && draft.universityEmail?.trim());
  if (
    draft.fullName &&
    draft.email &&
    applicantTypeDetails &&
    existingDocuments.APPLICANT_PHOTO?.uploadStatus === "UPLOADED"
  )
    done.add("applicant");
  const projectEligible = (() => {
    if (!COMPLETION_YEAR_RULE_CATEGORIES.includes(draft.projectCategory ?? "")) return true;
    if (!draft.clientName?.trim()) return false;
    if (existingDocuments.OWNER_AUTHORIZATION?.uploadStatus !== "UPLOADED") return false;
    if (draft.projectStatus === PROJECT_STATUS_COMPLETED) {
      const { min, max } = completionYearRange();
      return draft.completionYear != null && draft.completionYear >= min && draft.completionYear <= max;
    }
    return (PROJECT_STATUS_OPTIONS as readonly string[]).includes(draft.projectStatus ?? "");
  })();
  if (draft.projectName && draft.projectCategory && projectEligible) done.add("project");

  const hasExecutiveSummary =
    Boolean(draft.executiveSummary?.trim()) ||
    existingDocuments.EXECUTIVE_SUMMARY?.uploadStatus === "UPLOADED";
  const hasProjectDescription =
    Boolean(draft.projectDescription?.trim()) ||
    existingDocuments.PROJECT_DESCRIPTION?.uploadStatus === "UPLOADED";
  const hasCoveringLetter =
    Boolean(draft.coveringLetter?.trim()) ||
    existingDocuments.COVERING_LETTER?.uploadStatus === "UPLOADED";
  if (hasExecutiveSummary && hasProjectDescription && hasCoveringLetter) done.add("description");

  const hasDesignDemonstration =
    Boolean(draft.designDemonstration?.trim()) ||
    existingDocuments.DESIGN_DEMONSTRATION?.uploadStatus === "UPLOADED";
  const hasCosting =
    Boolean(draft.costing?.trim()) ||
    existingDocuments.COSTING?.uploadStatus === "UPLOADED";
  const costingRequired = draft.projectCategory !== "Visionary Design";
  if (hasDesignDemonstration && (hasCosting || !costingRequired)) done.add("technical");

  // Team members are optional and the applicant becomes team leader by default.
  done.add("team");

  if (draft.googleDriveUrl) done.add("drive");

  if (
    existingDocuments.SUSTAINABILITY_METRICS?.uploadStatus === "UPLOADED" &&
    existingDocuments.ARCHITECTURAL_DRAWINGS?.uploadStatus === "UPLOADED"
  )
    done.add("documents");

  if (
    draft.informationConfirmed &&
    draft.filesUploadedConfirmed &&
    draft.namingConventionConfirmed &&
    draft.authenticityConfirmed &&
    draft.termsAccepted
  )
    done.add("declaration");

  return done;
}, [draft, existingDocuments]);

  function goToSection(id: SectionId) {
    saveNow();
    setActiveSection(id);
  }

  // --- final submit -------------------------------------------------------

  async function handleFinalSubmit() {
    setSubmitError(null);
    setSubmitIssues([]);
    setSubmitting(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await flushSave();
    try {
      const { submission: finalized } = await submissions.submitFinal(
        applicationId,
        guestToken,
        idempotencyKeyRef.current
      );
      setSubmission(finalized);
      setConfirmOpen(false);
      trackPixelEvent("Submission", true);
      trackGaEvent("submission", { project_category: finalized.projectCategory ?? "" });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "We couldn't complete your submission. Your information has not been lost."
      );
      setSubmitIssues(
        err instanceof ApiError ? err.errors.map((e) => e.message).filter(Boolean) : []
      );
      // Close the confirm dialog so the list of missing items is visible.
      setConfirmOpen(false);
      // Fresh key for a genuinely new attempt after a hard failure.
      idempotencyKeyRef.current = newIdempotencyKey();
    } finally {
      setSubmitting(false);
    }
  }

  const yearRuleApplies = COMPLETION_YEAR_RULE_CATEGORIES.includes(draft.projectCategory ?? "");
  const yearRange = completionYearRange();
  const clientInfoRequired = draft.projectCategory !== "Visionary Design";

  // Collects every missing item before submission; mirrors the backend's
  // finalize checks. Executive Summary, Project Description, Covering Letter,
  // Design Demonstration and Costing are either/or: text OR an uploaded PDF.
  // Costing and client details are optional for Visionary Design only.
  function validateBeforeSubmit(): string[] {
    const issues: string[] = [];

    // Applicant
    if (invalidEmailFields.current.has("email")) issues.push("Applicant: enter a valid email address.");
    if (invalidEmailFields.current.has("universityEmail")) issues.push("Applicant: enter a valid university email address.");
    if (invalidEmailFields.current.has("clientEmail")) issues.push("Project: enter a valid client email, or leave it empty.");
    if (!draft.fullName?.trim()) issues.push("Applicant: enter your full name.");
    if (!draft.email?.trim()) issues.push("Applicant: enter your email.");
    if (draft.applicantType === "IAB_MEMBER") {
      if (!draft.iabMembershipNumber?.trim()) issues.push("Applicant: enter your IEB membership number.");
    } else {
      if (!draft.universityName?.trim()) issues.push("Applicant: enter your university name.");
      if (!draft.universityEmail?.trim()) issues.push("Applicant: enter your university email.");
    }

    // Project (category-specific eligibility)
    if (!draft.projectName?.trim()) issues.push("Project: enter your project name.");
    if (!draft.projectCategory?.trim()) issues.push("Project: select a project category.");
    if (yearRuleApplies) {
      if (!draft.projectStatus || !(PROJECT_STATUS_OPTIONS as readonly string[]).includes(draft.projectStatus)) {
        issues.push("Project: select the project status (Completed or Under Construction).");
      } else if (draft.projectStatus === PROJECT_STATUS_COMPLETED) {
        const year = draft.completionYear;
        if (year == null) {
          issues.push("Project: enter the completion year.");
        } else if (year < yearRange.min || year > yearRange.max) {
          issues.push(
            `Project: completion year ${year} is not eligible. Completed projects must have been completed between ${yearRange.min} and ${yearRange.max}.`,
          );
        }
      }
    }
    if (clientInfoRequired) {
      if (!draft.clientName?.trim()) issues.push("Project: enter the client name.");
    }

    // Team (no leader chosen → the backend makes the applicant team leader)
    for (const m of teamMembers) {
      const gaps = [
        !m.position && "position",
        !m.phone && "phone number",
        !m.email && "email",
        !m.applicantType && "member type",
        m.applicantType === "IAB_MEMBER" && !m.iabMembershipNumber && "IEB membership number",
        m.applicantType === "STUDENT" && !m.universityName && "university name",
        m.applicantType === "STUDENT" && !m.universityEmail && "university email",
      ].filter(Boolean);
      if (gaps.length > 0) {
        issues.push(
          `Team Members: "${m.fullName}" is missing ${gaps.join(", ")}. Remove and re-add them with all details.`,
        );
      }
    }

    // Project description, covering letter, technical information, Google
    // Drive link and the supporting PDFs are optional; only the word limit applies.
    if (
      draft.projectDescription?.trim() &&
      countWords(draft.projectDescription) > PROJECT_DESCRIPTION_WORD_LIMIT
    ) {
      issues.push(`Project Description: shorten the project description to ${PROJECT_DESCRIPTION_WORD_LIMIT} words or fewer.`);
    }

    // Declaration
    if (!draft.informationConfirmed) issues.push("Declaration: confirm your information is accurate.");
    if (!draft.filesUploadedConfirmed) issues.push("Declaration: confirm all files are uploaded.");
    if (!draft.namingConventionConfirmed) issues.push("Declaration: confirm your files follow the naming convention.");
    if (!draft.authenticityConfirmed) issues.push("Declaration: confirm the work is authentic.");
    if (!draft.termsAccepted) issues.push("Declaration: accept the terms and conditions.");

    return issues;
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
      {!disclaimerAcknowledged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/60 px-4 py-6 backdrop-blur-sm sm:px-6">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-deep sm:h-12 sm:w-12">
              <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none">
                <path
                  d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5V6l7-3Z"
                  stroke="#4dfbe4"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#4dfbe4"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <span className="mt-4 block text-xs font-bold uppercase tracking-[2px] text-accent-cyan sm:mt-5">
              Before You Continue
            </span>
            <h2 className="mt-2 text-lg font-bold text-navy-deep sm:text-xl">
            Disclaimer
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              By submitting your project to the Holcim Structural Excellence
              Award, you acknowledge and agree that all uploaded files,
              drawings, text, and supporting documents will be used
              exclusively for internal evaluation by the appointed Jury Panel
              and for LafargeHolcim marketing and promotional campaigns
              related to the awards. LafargeHolcim is committed to data
              security and will store and manage all submitted materials
              safely in accordance with internal corporate confidentiality
              standards.
            </p>

            <button
              type="button"
              onClick={() => setDisclaimerAcknowledged(true)}
              className="mt-6 w-full rounded-lg bg-navy-deep py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-navy-deep/90 sm:mt-7"
            >
              I Understand, Continue
            </button>
          </div>
        </div>
      )}

      <div className="brand-surface">
        <Header />
      </div>

      {/* Portal header — pinned so the save status stays visible while scrolling */}
      <div className="sticky top-0 z-40 shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">Application</p>
            <p className="font-mono text-xl font-bold text-navy-deep">{submission.applicationId}</p>
          </div>
          <div className="flex items-center gap-5">
            <p className="hidden text-xs font-semibold uppercase tracking-wide text-navy-deep/50 sm:block">
              {isAuthenticated && user ? `Signed in as ${user.fullName}` : "Guest session"}
            </p>
            <SaveStatus state={saveState} lastSavedAt={lastSavedAt} />
          </div>
        </div>
      </div>

      <SaveProblemBanner state={saveState} onRetry={saveNow} />
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
                        maxLength={LIMITS.fullName}
                        pattern={NAME_PATTERN}
                        title={NAME_TITLE}
                        className={inputClasses}
                        value={draft.fullName || ""}
                        onChange={(e) => update("fullName", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Email" required error={fieldErrors.email}>
                      <input
                        type="email"
                        maxLength={LIMITS.email}
                        className={inputClasses}
                        value={draft.email || ""}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Phone" hint="Bangladesh number, e.g. 01XXXXXXXXX">
                      <input
                        type="tel"
                        maxLength={LIMITS.phone}
                        pattern={BD_PHONE_PATTERN}
                        title={BD_PHONE_TITLE}
                        placeholder={BD_PHONE_PLACEHOLDER}
                        className={inputClasses}
                        value={draft.phone || ""}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Organization">
                      <input
                        maxLength={LIMITS.organization}
                        className={inputClasses}
                        value={draft.organization || ""}
                        onChange={(e) => update("organization", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Designation">
                      <input
                        maxLength={LIMITS.designation}
                        className={inputClasses}
                        value={draft.designation || ""}
                        onChange={(e) => update("designation", e.target.value)}
                      />
                    </FormField>
                  </div>
                {isIabApplicant ? (
                  <FormField label="IEB Membership Number" required error={fieldErrors.iabMembershipNumber}>
                    <input
                      maxLength={LIMITS.iabMembershipNumber}
                      className={inputClasses}
                      value={draft.iabMembershipNumber || ""}
                      onChange={(e) => update("iabMembershipNumber", e.target.value)}
                    />
                    <VerificationBadge
                      status={submission.iabVerificationStatus}
                      verifiedLabel="IEB membership verified"
                      failedLabel="This IEB membership number could not be verified."
                    />
                  </FormField>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FormField label="University Name" required error={fieldErrors.universityName}>
                        <input
                          maxLength={LIMITS.universityName}
                          className={inputClasses}
                          value={draft.universityName || ""}
                          onChange={(e) => update("universityName", e.target.value)}
                        />
                      </FormField>
                      <FormField label="University Email" required error={fieldErrors.universityEmail}>
                        <input
                          type="email"
                          maxLength={LIMITS.email}
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
                    {/* <DocumentUploadField
                      applicationId={submission.applicationId}
                      guestToken={guestToken}
                      def={docDefByType.APPLICANT_NID}
                      existingDoc={existingDocuments.APPLICANT_NID}
                      concurrencyGate={uploadGate}
                      onUploaded={handleDocUploaded}
                      onRemoved={handleDocRemoved}
                    /> */}
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
                      <input maxLength={LIMITS.projectName} className={inputClasses} value={draft.projectName || ""} onChange={(e) => update("projectName", e.target.value)} />
                    </FormField>
                    <FormField label="Project Category" required error={fieldErrors.projectCategory}>
                      <select
                        className={inputClasses}
                        value={draft.projectCategory || ""}
                        onChange={(e) => {
                          update("projectCategory", e.target.value);
                          // Status and completion year don't apply to Visionary Design.
                          if (!COMPLETION_YEAR_RULE_CATEGORIES.includes(e.target.value)) {
                            if (draft.projectStatus) update("projectStatus", "");
                            if (draft.completionYear != null) update("completionYear", null);
                          }
                        }}
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
                      <input maxLength={LIMITS.projectLocation} className={inputClasses} value={draft.projectLocation || ""} onChange={(e) => update("projectLocation", e.target.value)} />
                    </FormField>
                    {yearRuleApplies && (
                    <FormField label="Project Status" required>
                      <select
                        className={inputClasses}
                        value={draft.projectStatus || ""}
                        onChange={(e) => {
                          update("projectStatus", e.target.value);
                          if (e.target.value !== PROJECT_STATUS_COMPLETED && draft.completionYear != null) {
                            update("completionYear", null);
                          }
                        }}
                      >
                        <option value="" disabled>
                          Select project status
                        </option>
                        {PROJECT_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    )}
                    <FormField label="Client Project / Own Project">
                      <input maxLength={LIMITS.clientOwner} className={inputClasses} value={draft.clientOwner || ""} onChange={(e) => update("clientOwner", e.target.value)} />
                    </FormField>
                    <FormField label="Lead Engineer">
                      <input maxLength={LIMITS.leadEngineer} className={inputClasses} value={draft.leadEngineer || ""} onChange={(e) => update("leadEngineer", e.target.value)} />
                    </FormField>
                    {yearRuleApplies && draft.projectStatus === PROJECT_STATUS_COMPLETED && (
                      <FormField label="Completion Year" required>
                        <input
                          type="number"
                          min={yearRange.min}
                          max={yearRange.max}
                          step={1}
                          className={inputClasses}
                          value={draft.completionYear ?? ""}
                          onChange={(e) => update("completionYear", e.target.value ? Number(e.target.value) : null)}
                          placeholder={`${yearRange.min}–${yearRange.max}`}
                        />
                      </FormField>
                    )}
                  </div>

                  {/* Sibling of the fields grid, not nested inside it — spans full width */}
                  <h3 className="mt-2 text-sm font-bold uppercase tracking-wide text-navy-deep/60">
                    Client Information{!clientInfoRequired && " (Optional)"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField label="Client Name" required={clientInfoRequired} error={fieldErrors.clientName}>
                      <input maxLength={LIMITS.clientName} className={inputClasses} value={draft.clientName || ""} onChange={(e) => update("clientName", e.target.value)} />
                    </FormField>
                    <FormField label="Contact Number">
                      <input type="tel" maxLength={LIMITS.clientContactNumber} className={inputClasses} value={draft.clientContactNumber || ""} onChange={(e) => update("clientContactNumber", e.target.value)} />
                    </FormField>
                    <FormField label="Email" error={fieldErrors.clientEmail}>
                      <input type="email" maxLength={LIMITS.email} className={inputClasses} value={draft.clientEmail || ""} onChange={(e) => update("clientEmail", e.target.value)} />
                    </FormField>
                    <FormField label="Address">
                      <input maxLength={LIMITS.clientAddress} className={inputClasses} value={draft.clientAddress || ""} onChange={(e) => update("clientAddress", e.target.value)} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <DocumentUploadField
                      applicationId={submission.applicationId}
                      guestToken={guestToken}
                      def={
                        docDefByType.OWNER_AUTHORIZATION.optionalForCategories?.includes(draft.projectCategory ?? "")
                          ? { ...docDefByType.OWNER_AUTHORIZATION, required: false }
                          : docDefByType.OWNER_AUTHORIZATION
                      }
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
                      maxLength={LIMITS.longText}
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
                      maxLength={LIMITS.longText}
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
                  <FormField label="Covering Letter" hint="Type it here or upload a PDF below">
                    <textarea
                      maxLength={LIMITS.longText}
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
                      maxLength={LIMITS.longText}
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
                      maxLength={LIMITS.longText}
                      className={textareaClasses}
                      value={draft.materialSpecifications || ""}
                      onChange={(e) => update("materialSpecifications", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Construction Technology">
                    <textarea
                      maxLength={LIMITS.longText}
                      className={textareaClasses}
                      value={draft.constructionTechnology || ""}
                      onChange={(e) => update("constructionTechnology", e.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Costing"
                    hint="Type it here or upload a PDF below"
                  >
                    <textarea
                      maxLength={LIMITS.longText}
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

                <div className="rounded-xl border border-navy-deep/10 bg-white p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
                    How to get your Google Drive folder link
                  </h3>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-navy-deep/60">On a computer</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
                    <li>
                      Open{" "}
                      <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy-deep underline">
                        drive.google.com
                      </a>{" "}
                      and find your project folder.
                    </li>
                    <li>Right-click the folder and choose <span className="font-semibold">Share</span>, then <span className="font-semibold">Share</span> again.</li>
                    <li>
                      Under <span className="font-semibold">General access</span>, change "Restricted" to{" "}
                      <span className="font-semibold">Anyone with the link</span>, and keep the role as <span className="font-semibold">Viewer</span>.
                    </li>
                    <li>Click <span className="font-semibold">Copy link</span>, then <span className="font-semibold">Done</span>.</li>
                    <li>Paste the link in the box below.</li>
                  </ol>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-navy-deep/60">On a phone (Google Drive app)</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
                    <li>Tap the <span className="font-semibold">⋮</span> (three dots) next to your project folder.</li>
                    <li>Tap <span className="font-semibold">Share</span>, then <span className="font-semibold">Manage access</span>.</li>
                    <li>Under <span className="font-semibold">General access</span>, choose <span className="font-semibold">Anyone with the link</span> (Viewer).</li>
                    <li>Tap <span className="font-semibold">Copy link</span> and paste it below.</li>
                  </ol>
                  <p className="mt-4 rounded-lg bg-navy-deep/5 px-3 py-2 text-xs text-gray-600">
                    Your link should look like{" "}
                    <span className="font-mono text-navy-deep">https://drive.google.com/drive/folders/…</span>
                    . Share the <span className="font-semibold">whole folder</span>, not a single file.
                  </p>
                </div>

                <FormField
                  label="Google Drive Folder Link"
                  error={fieldErrors.googleDriveUrl}
                >
                  <input
                    type="url"
                    maxLength={LIMITS.googleDriveUrl}
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

  {/* Full Terms and Conditions */}
  <div className="rounded-xl border border-navy-deep/10 bg-navy-deep/5 p-6 text-sm leading-relaxed text-gray-700 max-h-[28rem] overflow-y-auto">
    <h3 className="text-base font-bold uppercase tracking-wide text-navy-deep">
      Holcim Structural Excellence Awards 2026 &mdash; Terms and Conditions
    </h3>
    <p className="mt-1 italic">
      Please read these Terms carefully before submitting your entry. Submitting an entry means you accept them.
    </p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Organiser and Acceptance</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">1.</span> The Holcim Structural Excellence Awards 2026 (&ldquo;HSEA 2026&rdquo; or the &ldquo;Award&rdquo;) are organised by LafargeHolcim Bangladesh PLC (the &ldquo;Organiser&rdquo;), acting through its Award Authority, Award Secretariat and independent Jury Panel (together, the &ldquo;Award Authority&rdquo;). There are no co-organisers. The Award is run through www.structuralexcellenceawardbd.com (the &ldquo;Website&rdquo;) and its submission portal (the &ldquo;Portal&rdquo;).</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">2.</span> By registering an account, ticking the declaration box, signing the Declaration &amp; Submission Agreement Form (the &ldquo;Form&rdquo;) or submitting an entry, each applicant, team member and Authorised Representative (together, &ldquo;Entrant&rdquo;) agrees to these Terms and Conditions (&ldquo;Terms&rdquo;), the Form and the eligibility, submission and evaluation criteria published on the Website. If there is a conflict, these Terms prevail. If you do not agree, do not submit an entry.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Categories and Eligibility</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">3.</span> Entries may be made in the following categories: (a) High Performance Concrete Structure; (b) Advanced Construction Technology &amp; Circularity; and (c) Next Generation Visionary Design and the Legendary Structural Engineer Award is an honorary lifetime achievement award; the recipient is selected by the Jury Panel through its own nomination process and direct submissions are not accepted.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">4.</span> For categories (a) and (b), the project must be physically located in Bangladesh; be fully completed within the last 5 years, or be an ongoing project at least 20% complete; be led by a full member or fellow of the Institution of Engineers, Bangladesh (IEB); and its structural design and execution must strictly comply with the Bangladesh National Building Code (BNBC) and hold all necessary regulatory approvals.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">5.</span> For category (c), Entrants must be final-year structural or civil engineering students, or early-career structural engineers up to IEB Associate Member status. Students must verify their status with an email on an approved university domain; IEB members must give an IEB membership number, which the Portal verifies before an entry can be finalised.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">6.</span> Employees of the Organiser and its affiliates, Jury Panel members and their immediate families, and anyone involved in running the Award may not enter. The Award Authority may require further proof of eligibility at any time.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Submission Requirements</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">7.</span> Entries must be submitted through the Portal by 11:59 PM (Bangladesh time) on October 31, 2026, unless the Organiser extends the deadline on the Website. Entrants must register an account and keep their login details secure, and are responsible for all activity on their account.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">8.</span> Each entry must include the completed Form and all materials listed in the Website submission guidelines, including the project presentation, documentation, drawings, Client/Owner Authorization Form, sustainability metrics and team member details and photographs (&ldquo;Materials&rdquo;). Photographs, structural drawings, CAD and CDR files must be provided through a Google Drive folder shared with the Organiser, named using the Portal-issued Application ID and kept accessible until the Award ends. The Entrant is responsible for that folder and the access it grants.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">9.</span> Late, incomplete, unverified, illegible or inaccessible entries may be rejected. The Organiser is not responsible for technical failures, lost or delayed uploads, or third-party platforms. If technical problems prevent online submission, a complete hard copy may be delivered to the Organiser&apos;s office before the deadline. Entries cannot be changed after submission unless the Award Authority asks for clarification. Names and organisational hierarchy given in the Form will appear on certificates, trophies and publications, and the Entrant is responsible for their accuracy.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Entrant Declarations and Warranties</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">10.</span> The Entrant declares and warrants that: (a) all information and Materials are complete, accurate, true and authentic; (b) the project is the Entrant&apos;s original structural design work; (c) the entry is made with the full authorisation of all collaborators, engineering firms, project owners and any other person whose consent is needed; (d) the Materials do not infringe any intellectual property, confidentiality, privacy or other right of any person and contain no confidential information the Entrant is not free to disclose; (e) the project is completed, or has reached the stage of completion stated in the entry, and complies with applicable laws, building codes and safety standards; and (f) the project is not, to the Entrant&apos;s knowledge, the subject of any legal, regulatory or professional malpractice dispute, and the Entrant will promptly notify the Organiser if one arises.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">11.</span> The Entrant remains solely responsible for any errors, omissions or misrepresentations in the entry. The Award Authority does not verify, approve or certify the structural adequacy or safety of any project, and no award amounts to such certification.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Intellectual Property and Licence</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">12.</span> The Entrant (or its licensors) keeps ownership of all intellectual property in the project and Materials. Nothing in these Terms transfers ownership to the Organiser.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">13.</span> The Entrant grants the Organiser and its affiliates a non-exclusive, royalty-free, worldwide, perpetual and irrevocable licence to use, reproduce, adapt (for formatting or length only), publish, display and communicate the Materials, and the names, likenesses and project details of the Entrant and team members, for judging, publications, exhibitions, promotional campaigns, technical documentation, digital and social media and other activities connected with the Award or the Organiser&apos;s promotion of sustainable construction, with reasonable credit where practicable. The Entrant waives, to the extent permitted by law, any moral rights that would prevent such use and confirms it has obtained the same from team members and photographers.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">14.</span> The Organiser is not obliged to use any Materials and may stop using them at any time. Materials are not returned.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Personal Data and Consent</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">15.</span> The Organiser will collect and use personal data in the Form (including names, IEB registration numbers, roles, signatures, contact details and images) to administer, judge and promote the Award, verify eligibility, announce winners, communicate with Entrants and meet legal obligations. Data may be shared with the Jury Panel, Award Secretariat, affiliates and service providers bound by confidentiality, and may be stored or processed outside Bangladesh with appropriate safeguards.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">16.</span> The Organiser will keep data secure, retain it only as long as needed for these purposes or as required by law, and apply the applicable laws of Bangladesh and its group data privacy policies. The Entrant confirms it has informed every team member and other person named in the entry of this clause and obtained their consent. Individuals may request access to or correction of their data, or withdraw consent to promotional use, by contacting the Award Secretariat; withdrawal may affect the ability to participate.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Judging</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">17.</span> Entries pass through shortlisting (eligibility and compliance screening) and jury evaluation, which may include candidate presentations, before winners are honoured at a grand gala in Dhaka (expected in January 2027). Each category is scored on a 100-point scale using the criteria on the Website; the highest-scoring entry in each category wins it, and category winners may be reassessed for the Grand Winner title. Shortlisted Entrants who do not attend a requested presentation may be withdrawn.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">18.</span> The Award Authority may move an entry to a more suitable category, request more information, or verify information with third parties, including the IEB, universities and project owners. The Jury Panel&apos;s decisions are final, binding and not subject to appeal, and feedback is not guaranteed. The Award Authority may decide not to make an award in any category.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Rejection, Disqualification and Revocation</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">19.</span> The Award Authority may reject or disqualify any entry, at any stage, if the Entrant breaches these Terms; the entry fails to meet eligibility rules; information is unverifiable, misleading, inaccurate or fraudulent; the Entrant attempts to influence the Jury Panel or acts dishonestly; or the entry violates the professional standards of the Award or could bring the Award or the Organiser into disrepute.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">20.</span> The Award Authority may revoke any award or recognition already conferred if submitted information is later found to be fraudulent or materially inaccurate, the project becomes the subject of a legal, regulatory or professional malpractice dispute, or any ground for disqualification is discovered. The Entrant must then return any certificate, trophy or prize and stop referring to the award, and the Organiser may publish the revocation.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Awards and Publicity</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">21.</span> Awards are as announced on the Website. The Grand Winner will receive BDT 5,00,000, and winners will receive trophies and recognition. Prizes are personal to the named winners, cannot be transferred or exchanged, and prize money is paid net of any taxes the Organiser must deduct by law. Winners must cooperate reasonably with announcements and the gala.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">22.</span> Winners may refer to their award in line with any brand guidelines from the Organiser, but may not otherwise use the Holcim or LafargeHolcim names or logos without written consent.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Indemnity and Limitation of Liability</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">23.</span> The Entrant agrees to indemnify and hold harmless the Organiser, its affiliates, the Award Authority, Award Secretariat, Jury Panel and their officers, employees and agents against all losses, damages, liabilities, costs and expenses (including reasonable legal fees) arising from any breach of these Terms, any inaccurate declaration, or any claim that the Materials or their use under these Terms infringe the rights of any person.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">24.</span> To the extent permitted by law, the Organiser is not liable for any indirect or consequential loss, loss of profit, opportunity or reputation, or for any loss arising from participation in the Award, the use of Materials as permitted, or events beyond its reasonable control. The Organiser&apos;s total liability to any Entrant is limited to the value of any award won by that Entrant. Nothing limits liability for fraud, death or personal injury caused by negligence, or any liability that cannot be limited by law.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Changes, Cancellation and General</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">25.</span> The Organiser may amend these Terms, or postpone, suspend or cancel the Award, where reasonably necessary, by publishing notice on the website. Amendments will not apply retrospectively to the detriment of entries already judged.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">26.</span> These Terms, the Form and the published guidelines are the entire agreement on the Award. If any provision is invalid, the rest remains in force. A failure to enforce a right is not a waiver. The Entrant may not assign its rights. Electronic acceptance and signatures are binding. The English version prevails over any translation.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Governing Law and Dispute Resolution</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">27.</span> These Terms and any dispute arising from or in connection with them or the Award are governed by the laws of Bangladesh.</p>
    <p className="mt-2"><span className="font-semibold text-navy-deep">28.</span> The parties will first try to resolve any dispute by good-faith negotiation. If unresolved within 30 days of written notice, either party may refer it to mediation in Dhaka under the mediation rules of the Bangladesh International Arbitration Centre (BIAC). If not settled within 60 days of the mediation referral, the dispute will be finally resolved by arbitration in Dhaka under the Arbitration Act 2001 and the BIAC Arbitration Rules.</p>

    <h4 className="mt-6 font-bold uppercase tracking-wide text-navy-deep">Contact</h4>
    <p className="mt-2"><span className="font-semibold text-navy-deep">29.</span> Questions, notices and data requests may be sent to the Award Secretariat, LafargeHolcim Bangladesh PLC, on +8801755514180 (10:00 AM to 5:00 PM), or through the contact details on the Website.</p>
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
                        ...(yearRuleApplies ? [["Status", draft.projectStatus]] : []),
                        ...(yearRuleApplies && draft.projectStatus === PROJECT_STATUS_COMPLETED
                          ? [["Completion Year", draft.completionYear?.toString()]]
                          : []),
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
                      {submitIssues.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1 pl-5">
                          {submitIssues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-3 text-red-600/80">
                        Your information has not been lost. Fix the items above and try again.
                      </p>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const issues = validateBeforeSubmit();
                      if (issues.length > 0) {
                        setSubmitError(
                          `${issues.length} ${issues.length === 1 ? "item needs" : "items need"} your attention before you can submit:`
                        );
                        setSubmitIssues(issues);
                        return;
                      }
                      setSubmitError(null);
                      setSubmitIssues([]);
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