import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FadeIn from "../components/FadeIn";
import FormField, { inputClasses } from "../components/Formfield";
import { ApiError, auth } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { ApplicantType } from "../types/Submission";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  organization: string;
  designation: string;
  applicantType: ApplicantType;
  iabMembershipNumber: string;
  universityName: string;
  universityEmail: string;
};

const INITIAL: FormState = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  organization: "",
  designation: "",
  applicantType: "STUDENT",
  iabMembershipNumber: "",
  universityName: "",
  universityEmail: "",
};

export default function Register() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      // registerSchema is .strict() — only send the fields the applicant type needs.
      await auth.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        organization: form.organization || undefined,
        designation: form.designation || undefined,
        applicantType: form.applicantType,
        iabMembershipNumber:
          form.applicantType === "IAB_MEMBER" ? form.iabMembershipNumber : undefined,
        universityName: form.applicantType === "STUDENT" ? form.universityName : undefined,
        universityEmail: form.applicantType === "STUDENT" ? form.universityEmail : undefined,
      });
      await refresh();
      navigate("/submit", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors.length > 0) {
          const map: Record<string, string> = {};
          for (const e2 of err.errors) if (e2.field) map[e2.field] = e2.message;
          setFieldErrors(map);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isIab = form.applicantType === "IAB_MEMBER";

  return (
    <div className="min-h-screen bg-white">
      <div className="brand-surface">
        <Header />
      </div>

      <section className="mx-auto max-w-lg px-6 py-20">
        <FadeIn>
          <span className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">
            Create an Account
          </span>
          <h1 className="mt-3 text-3xl font-bold text-navy-deep">Register</h1>
          <p className="mt-2 text-sm text-gray-600">
            Optional — you can also submit as a guest without an account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <FormField label="Applicant Type" required>
              <div className="flex gap-3">
                {(["STUDENT", "IAB_MEMBER"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set("applicantType", type)}
                    className={[
                      "flex-1 rounded-lg border px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors",
                      form.applicantType === type
                        ? "border-navy-deep bg-navy-deep text-white"
                        : "border-navy-deep/15 text-navy-deep/70 hover:border-navy-deep/40",
                    ].join(" ")}
                  >
                    {type === "IAB_MEMBER" ? "IEB Member" : "Student"}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Full Name" required error={fieldErrors.fullName}>
              <input
                required
                className={inputClasses}
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Email" required error={fieldErrors.email}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={inputClasses}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </FormField>
              <FormField
                label="Password"
                required
                hint="min 10 characters"
                error={fieldErrors.password}
              >
                <input
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  className={inputClasses}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Phone">
                <input
                  className={inputClasses}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </FormField>
              <FormField label="Organization">
                <input
                  className={inputClasses}
                  value={form.organization}
                  onChange={(e) => set("organization", e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Designation">
              <input
                className={inputClasses}
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
              />
            </FormField>

            {isIab ? (
              <FormField
                label="IEB Membership Number"
                required
                error={fieldErrors.iabMembershipNumber}
              >
                <input
                  required
                  className={inputClasses}
                  value={form.iabMembershipNumber}
                  onChange={(e) => set("iabMembershipNumber", e.target.value)}
                />
              </FormField>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="University Name" required error={fieldErrors.universityName}>
                  <input
                    required
                    className={inputClasses}
                    value={form.universityName}
                    onChange={(e) => set("universityName", e.target.value)}
                  />
                </FormField>
                <FormField label="University Email" required error={fieldErrors.universityEmail}>
                  <input
                    type="email"
                    required
                    className={inputClasses}
                    value={form.universityEmail}
                    onChange={(e) => set("universityEmail", e.target.value)}
                  />
                </FormField>
              </div>
            )}

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
              {submitting ? "Creating account…" : "Create Account"}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a href="/login" className="font-semibold text-accent-cyan hover:underline">
              Sign in
            </a>
          </p>
        </FadeIn>
      </section>

      <Footer />
    </div>
  );
}