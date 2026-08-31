import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FadeIn from "../components/FadeIn";
import FormField, { inputClasses } from "../components/Formfield";
import { useAuth } from "../context/AuthContext";
import { isValidApplicationIdFormat } from "../lib/Applicationid";
import { ApiError, profile, resolveMediaUrl } from "../lib/api";

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

export default function Profile() {
  const { user, isAuthenticated, loading, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

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

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = lookupId.trim().toUpperCase();
    if (!isValidApplicationIdFormat(id)) {
      setLookupError("That doesn't look like a valid Application ID (e.g. HSEA26-8F42KQ).");
      return;
    }
    setLookupError(null);
    navigate(`/submission/${id}`);
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

  // previewUrl is a local blob: URL (used while uploading) and needs no
  // resolving; user.profilePhotoUrl comes from the backend as a path
  // relative to the API origin and must be resolved before rendering.
  const avatarSrc = previewUrl || resolveMediaUrl(user.profilePhotoUrl);

  return (
    <div className="min-h-screen bg-white">
      <div className="brand-surface">
        <Header />
      </div>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <FadeIn>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label={avatarSrc ? "Change profile photo" : "Upload profile photo"}
                className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-navy-deep/10 text-lg font-bold text-navy-deep ring-2 ring-white shadow-sm transition-opacity disabled:opacity-70"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials(user.fullName) || "?"}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-navy-deep/60 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
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
              <span className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">
                My Account
              </span>
              <h1 className="mt-1 text-3xl font-bold text-navy-deep">{user.fullName}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Member since {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400">JPEG, PNG, or WebP, up to 2MB.</p>
          {photoError && (
            <p className="mt-1.5 text-xs font-semibold text-red-600" role="alert">
              {photoError}
            </p>
          )}
        </FadeIn>

        {/* Account details */}
        <FadeIn delay={0.05}>
          <div className="mt-10 rounded-xl border border-navy-deep/10 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
                Account Details
              </h2>
            </div>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm text-navy-deep">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-xs text-gray-400">
              To update these details, contact the award secretariat — account editing isn't
              available on this page yet.
            </p>
          </div>
        </FadeIn>

        {/* Find a submission */}
        <FadeIn delay={0.1}>
          <div className="mt-6 rounded-xl border border-navy-deep/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-deep">
              Continue a Submission
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the Application ID you received when you started a submission.
            </p>
            <form onSubmit={handleLookup} className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <FormField label="Application ID" error={lookupError || undefined}>
                  <input
                    className={inputClasses}
                    placeholder="HSEA26-8F42KQ"
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-navy-deep px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-deep/90"
                >
                  Open
                </motion.button>
              </div>
            </form>
            <a
              href="/submit"
              className="mt-4 inline-block text-xs font-bold uppercase tracking-wide text-accent-cyan hover:underline"
            >
              Start a new submission →
            </a>
          </div>
        </FadeIn>

        {/* Sign out */}
        <FadeIn delay={0.15}>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-8 text-sm font-bold uppercase tracking-wide text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign Out"}
          </button>
        </FadeIn>
      </section>

      <Footer />
    </div>
  );
}