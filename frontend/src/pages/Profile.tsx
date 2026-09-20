import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FadeIn from "../components/FadeIn";
import { useAuth } from "../context/AuthContext";
import { ApiError, profile, resolveMediaUrl, submissions } from "../lib/api";
import type { Submission, SubmissionStatus } from "../types/Submission";

// Mirrors the backend's 2MB ceiling (see pictureUpload.service.js). This
// is only a fast, friendly pre-check — the backend is always the final
// authority on what's actually accepted.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Splits a flat list into row-groups of `size`, for a divider-per-row grid. */
function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  DRAFT: "Draft — not yet submitted",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  FINALIST: "Finalist",
  WINNER: "Winner",
  REJECTED: "Not Selected",
};

const STATUS_BADGE_CLASSES: Record<SubmissionStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-accent-cyan/15 text-navy-deep",
  UNDER_REVIEW: "bg-blue-50 text-blue-700",
  SHORTLISTED: "bg-amber-50 text-amber-700",
  FINALIST: "bg-amber-50 text-amber-700",
  WINNER: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function Profile() {
  const { user, isAuthenticated, loading, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const [signingOut, setSigningOut] = useState(false);

  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Local object URLs must be revoked explicitly or they leak memory —
  // clean up whenever the preview changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load every submission tied to this account so the applicant can see
  // at a glance what they've submitted (or still have in draft) without
  // needing to remember an Application ID.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    submissions
      .mine()
      .then(({ submissions: list }) => {
        if (!cancelled) setMySubmissions(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setSubmissionsError(
          err instanceof ApiError ? err.message : "Couldn't load your submissions."
        );
      })
      .finally(() => {
        if (!cancelled) setSubmissionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm font-semibold uppercase tracking-wide text-navy-deep/50">
          Loading your account…
        </p>
      </div>
    );
  }

  // No account, no profile to show — send them to sign in and back here after.
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: "/profile" }} replace />;
  }

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    navigate("/submit");
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-selecting the same file re-fires onChange
    if (!file) return;

    setPhotoError(null);

    const isAcceptedType = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
      file.type
    );
    if (!isAcceptedType) {
      setPhotoError("Please choose a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("That photo is too large. Maximum size is 2MB.");
      return;
    }

    // Show it immediately from the local file while the upload is in
    // flight, then swap to the server-processed version once it lands.
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return localUrl;
    });

    setUploadingPhoto(true);
    try {
      await profile.uploadPhoto(file);
      await refresh();
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
    } catch (err) {
      setPhotoError(
        err instanceof ApiError ? err.message : "Couldn't upload your photo. Please try again."
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  const fields: Array<[string, string | null | undefined]> = [
    ["Full Name", user.fullName],
    ["Email", user.email],
    ["Phone", user.phone],
    ["Organization", user.organization],
    ["Designation", user.designation],
    ["Applicant Type", user.applicantType === "IAB_MEMBER" ? "IAB Member" : "Student"],
  ];
  const fieldRows = chunk(fields, 2);

  // previewUrl is a local blob: URL (used while uploading) and needs no
  // resolving; user.profilePhotoUrl comes from the backend as a path
  // relative to the API origin and must be resolved before rendering.
  const avatarSrc = previewUrl || resolveMediaUrl(user.profilePhotoUrl);

  return (
    <div className="min-h-screen bg-white">
      <div className="brand-surface">
        <Header />
      </div>

      <FadeIn y={12}>
        <section className="mx-auto max-w-4xl px-6 py-12 lg:py-14">
          {/* Profile header */}
          <div className="flex flex-col gap-6 border-b border-navy-deep/10 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  aria-label={avatarSrc ? "Change profile photo" : "Upload profile photo"}
                  className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-navy-deep/10 text-base font-bold text-navy-deep ring-1 ring-navy-deep/10 transition-opacity disabled:opacity-70"
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials(user.fullName) || "?"}</span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-navy-deep/60 text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {uploadingPhoto ? "Uploading…" : avatarSrc ? "Change" : "Upload"}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handlePhotoSelected}
                />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-accent-cyan">
                  My Account
                </span>
                <h1 className="mt-1 text-2xl font-bold leading-tight text-navy-deep sm:text-3xl">
                  {user.fullName}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Member since {formatDate(user.createdAt)}
                </p>
              </div>
            </div>

            <div className="shrink-0 sm:text-right">
              <p className="text-xs text-gray-400">JPEG, PNG, or WebP, up to 2MB.</p>
              {photoError && (
                <p className="mt-1 text-xs font-semibold text-red-600" role="alert">
                  {photoError}
                </p>
              )}
            </div>
          </div>

          {/* Account information */}
          <div className="border-b border-navy-deep/10 py-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-navy-deep/50">
              Account Information
            </h2>

            <dl className="mt-5 divide-y divide-navy-deep/10">
              {fieldRows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-x-10 gap-y-3 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-2"
                >
                  {row.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-navy-deep/45">
                        {label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-navy-deep">{value || "—"}</dd>
                    </div>
                  ))}
                </div>
              ))}
            </dl>

            <p className="mt-5 text-xs text-gray-400">
              To update these details, contact the award secretariat — account editing isn't
              available on this page yet.
            </p>
          </div>

          {/* Your submissions */}
          <div className="border-b border-navy-deep/10 py-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-navy-deep/50">
              Your Submissions
            </h2>

            {submissionsLoading && (
              <p className="mt-4 text-sm text-gray-400">Loading your submissions…</p>
            )}

            {submissionsError && (
              <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
                {submissionsError}
              </p>
            )}

            {!submissionsLoading && !submissionsError && mySubmissions.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">
                You haven't started a submission yet.
              </p>
            )}

            {!submissionsLoading && mySubmissions.length > 0 && (
              <div className="mt-5 border-t border-navy-deep/10">
                {mySubmissions.map((s) => (
                  <div
                    key={s.applicationId}
                    className="flex flex-col items-start justify-between gap-3 border-b border-navy-deep/10 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-navy-deep">
                        {s.projectName || "Untitled project"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-gray-500">{s.applicationId}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {s.status === "DRAFT"
                          ? `Started ${formatDate(s.createdAt)}`
                          : s.submittedAt
                            ? `Submitted ${formatDate(s.submittedAt)}`
                            : ""}
                      </p>
                    </div>

                    <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
                      <SubmissionStatusBadge status={s.status} />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => navigate(`/submission/${s.applicationId}`)}
                        className="rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors"
                        style={
                          s.status === "DRAFT"
                            ? {
                                backgroundColor: "rgb(15, 23, 42)",
                                color: "white",
                              }
                            : {
                                backgroundColor: "rgba(15, 23, 42, 0.05)",
                                color: "rgb(15, 23, 42)",
                              }
                        }
                      >
                        {s.status === "DRAFT" ? "Continue" : "View"}
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Start new submission */}
          <div className="border-b border-navy-deep/10 py-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-navy-deep/50">
              Ready to Submit?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Start a new submission for the HSEA 2026 awards.
            </p>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 inline-block"
            >
              <a
                href="/submit"
                className="inline-flex rounded-lg bg-navy-deep px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-deep/90"
              >
                Start New Submission
              </a>
            </motion.div>
          </div>

          {/* Sign out */}
          <div className="pt-6">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs font-bold uppercase tracking-wide text-red-600 hover:text-red-700 disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </section>
      </FadeIn>

      <Footer />
    </div>
  );
}