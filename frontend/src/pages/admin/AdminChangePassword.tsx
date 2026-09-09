import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAuth, AdminApiError } from "../../lib/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminChangePassword() {
  const navigate = useNavigate();
  const { admin, refresh } = useAdminAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 10) {
      setError("New password must be at least 10 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await adminAuth.changePassword(currentPassword, newPassword);
      await refresh();
      navigate("/123456789/admin", { replace: true });
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-deep px-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8">
        <span className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">
          {admin?.fullName}
        </span>
        <h1 className="mt-2 text-2xl font-bold text-navy-deep">Set a New Password</h1>
        <p className="mt-2 text-sm text-gray-500">
          You're using a temporary password. Please set your own before continuing.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-navy-deep/70">
              Current (temporary) password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-navy-deep/15 px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-navy-deep/70">
              New password (min 10 characters)
            </label>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-navy-deep/15 px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-navy-deep/70">
              Confirm new password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-navy-deep/15 px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-navy-deep py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-deep/90 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}