import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminApiError } from "../../lib/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from || "/123456789/admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { adminAuth } = await import("../../lib/adminApi");
      await adminAuth.login(email, password);
      await refresh();
      navigate(redirectTo, { replace: true });
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
          HSEA 2026
        </span>
        <h1 className="mt-2 text-2xl font-bold text-navy-deep">Admin Sign In</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-navy-deep/70">Email</label>
            <input
              type="email"
              required
              autoComplete="username"
              className="mt-1.5 w-full rounded-lg border border-navy-deep/15 px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-navy-deep/70">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-navy-deep/15 px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}