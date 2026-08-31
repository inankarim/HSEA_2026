import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FadeIn from "../components/FadeIn";
import FormField, { inputClasses } from "../components/Formfield";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from || "/submit";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await auth.login(email, password);
      await refresh();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="brand-surface">
        <Header />
      </div>

      <section className="mx-auto max-w-md px-6 py-20">
        <FadeIn>
          <span className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">
            Welcome Back
          </span>
          <h1 className="mt-3 text-3xl font-bold text-navy-deep">Sign In</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to pick up a submission you already started, or check your entry status.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <FormField label="Email" required htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                className={inputClasses}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <FormField label="Password" required htmlFor="login-password">
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                className={inputClasses}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            {error && (
              <p className="text-sm font-semibold text-red-600" role="alert">
                {error}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-navy-deep py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-deep/90 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <a href="/register" className="font-semibold text-accent-cyan hover:underline">
              Create one
            </a>
          </p>
          <p className="mt-2 text-center text-sm text-gray-500">
            Prefer not to register?{" "}
            <a href="/submit" className="font-semibold text-accent-cyan hover:underline">
              Continue as guest
            </a>
          </p>
        </FadeIn>
      </section>

      <Footer />
    </div>
  );
}