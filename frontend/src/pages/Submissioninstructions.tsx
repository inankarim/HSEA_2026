import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FadeIn from "../components/FadeIn";
import { ApiError, storeGuestAccessToken, submissions } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const PROCESS_STEPS = [
  {
    n: "01",
    title: "Prepare",
    body: "Gather every required document — presentation sheets, written descriptions, drawings, photographs, and technical files — before you start the form.",
  },
  {
    n: "02",
    title: "Fill & Upload",
    body: "Complete the online form and upload most of your project documents directly here — executive summary, project description, design demonstration, drawings, authorization forms, and identification — each as a PDF under 2MB.",
  },
  {
    n: "03",
    title: "Google Drive for the Rest",
    body: "A few larger files can't be uploaded here. Create your own Google Drive folder, upload your project photographs, structural drawings, CAD file, and CDR file there, and paste the shared folder link into the form.",
  },
  {
    n: "04",
    title: "Declare & Submit",
    body: "Confirm your declaration, review everything, and submit your application.",
  },
];

const REQUIREMENT_GROUPS = [
  {
    channel: "Uploaded directly in the portal",
    title: "Project Presentation",
    items: ["Maximum 2 A0 sheets", "Landscape format", "Combined into one PDF, min. 300 DPI", "PDF upload, max 2MB"],
  },
  {
    channel: "Uploaded directly in the portal",
    title: "Project Documentation",
    items: [
      "Executive Summary — 1 page (text or PDF)",
      "Project Description — max 500 words (text or PDF)",
      "Design Demonstration — max 5 pages (text or PDF)",
      "Material Specifications & Construction Technology — written in the form",
      "Costing, where applicable (text or PDF)",
      "Covering Letter (text or PDF)",
    ],
  },
  {
    channel: "Uploaded directly in the portal",
    title: "Drawings & Authorizations",
    items: [
      "Architectural drawings (PDF, max 2MB)",
      "Client / Owner Authorization Form (PDF, max 2MB)",
      "Sustainability Metrics / CO₂ Reduction Support (PDF, max 2MB)",
    ],
  },
  {
    channel: "Uploaded directly in the portal",
    title: "Applicant & Team Documents",
    items: [
      "IEB membership number, or university name & email",
      "NID / Passport for every team member (max 2MB each)",
      "Photograph for every team member (max 2MB each)",
    ],
  },
  {
    channel: "Uploaded to your Google Drive folder",
    title: "Visual & Structural Files",
    items: ["7–10 high-resolution project photographs, 300 DPI minimum", "Structural drawings & diagrams — A3 PDF"],
  },
  {
    channel: "Uploaded to your Google Drive folder",
    title: "Technical Files",
    items: ["Complete CAD file (.dwg)", "CDR file", "Shared Google Drive folder link, kept accessible"],
  },
];

const FILE_NAME_EXAMPLES = [
  "HSEA26-8F42KQ_Photo_01.jpg",
  "HSEA26-8F42KQ_Photo_02.jpg",
  "HSEA26-8F42KQ_Structural_Drawings_A3.pdf",
  "HSEA26-8F42KQ_CAD.dwg",
  "HSEA26-8F42KQ_Complete.cdr",
];

const CHECKLIST = [
  "Your applicant information",
  "IEB membership number, or a university email",
  "Project information",
  "Team member details, with NID/Passport and photo for each",
  "Project documents ready to upload directly (PDF, under 2MB each)",
  "Photographs, structural drawings, CAD and CDR files ready for Google Drive",
  "Your Google Drive folder, already created and shared",
  "Google Drive files renamed to the required convention",
  "Correct Google Drive sharing permissions",
];

export default function SubmissionInstructions() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showGuestPanel, setShowGuestPanel] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function beginSubmission(email?: string) {
    setStarting(true);
    setStartError(null);
    try {
      const result = await submissions.start(email);
      if (result.guestAccessToken) {
        storeGuestAccessToken(result.applicationId, result.guestAccessToken);
      }
      navigate(`/submission/${result.applicationId}`);
    } catch (err) {
      setStartError(
        err instanceof ApiError ? err.message : "Something went wrong starting your submission."
      );
      setStarting(false);
    }
  }

  function handleStartClick() {
    if (authLoading) return;
    if (isAuthenticated) {
      beginSubmission();
    } else {
      setShowGuestPanel(true);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="brand-surface">
        <Header />
      </div>

      {/* Hero */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <FadeIn>
            <span className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">
              Submission 2026
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-navy-deep">
              Submit Your Project
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
              Prepare your project materials, upload most documents directly through the
              submission portal, and share your Google Drive folder for your
              photographs, structural drawings, CAD file, and CDR file.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* 4-step process */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <FadeIn>
            <h2 className="text-sm font-bold uppercase tracking-[3px] text-navy-deep/50">
              How submission works
            </h2>
          </FadeIn>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.08}>
                <div className="h-full rounded-xl bg-white p-6 shadow-sm">
                  <span className="text-3xl font-bold text-accent-cyan">{step.n}</span>
                  <h3 className="mt-3 text-base font-bold uppercase tracking-wide text-navy-deep">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Auto-save notice */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <FadeIn>
            <div className="rounded-2xl border border-accent-cyan/30 bg-navy-deep px-8 py-10 text-white">
              <h3 className="text-xl font-bold uppercase tracking-wide text-accent-cyan">
                Your progress auto-saves — but only if you can get back to it
              </h3>
              <p className="mt-3 max-w-2xl leading-relaxed text-white/80">
                If you're signed in, your form auto-saves as you go and you can return
                any time from your account. If you're continuing as a guest, your
                progress auto-saves within that same session — you're free to switch
                tabs — but it isn't tied to your account, so if you leave and lose that
                session before submitting, your progress cannot be recovered. Guests
                should plan to complete and submit their application in one sitting.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Application ID */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-5xl px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
          <FadeIn>
            <h3 className="text-sm font-bold uppercase tracking-[3px] text-navy-deep/50">
              Your Application ID
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              When you start your submission, the system generates a unique Application
              ID. Use this ID when naming your Google Drive folder and any files you
              place inside it.
            </p>
            <div className="mt-5 rounded-lg border border-navy-deep/15 bg-white px-4 py-3">
              <code className="font-mono text-sm text-navy-deep">HSEA26-8F42KQ</code>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h3 className="text-sm font-bold uppercase tracking-[3px] text-navy-deep/50">
              Google Drive Folder Naming
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              Name your shared Google Drive folder using your Application ID followed by
              your project name. This applies only to the files that go in Drive —
              photographs, structural drawings, CAD file, and CDR file.
            </p>
            <div className="mt-5 rounded-lg border border-navy-deep/15 bg-white px-4 py-3">
              <code className="font-mono text-sm text-navy-deep">HSEA26-8F42KQ - Dhaka Convention Center</code>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* File naming convention */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <FadeIn>
            <h3 className="text-sm font-bold uppercase tracking-[3px] text-navy-deep/50">
              Google Drive File Naming Convention
            </h3>
            <p className="mt-4 text-sm text-gray-600">
              Every file you place in your Google Drive folder follows: <span className="font-mono text-navy-deep">[Application ID]_[Document Type].[extension]</span>
            </p>
          </FadeIn>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FILE_NAME_EXAMPLES.map((name) => (
              <div
                key={name}
                className="truncate rounded-lg bg-gray-50 px-4 py-2.5 font-mono text-xs text-navy-deep/80"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <FadeIn>
            <h2 className="text-sm font-bold uppercase tracking-[3px] text-navy-deep/50">
              Submission Requirements
            </h2>
          </FadeIn>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {REQUIREMENT_GROUPS.map((group, i) => (
              <FadeIn key={group.title} delay={i * 0.05}>
                <div className="h-full rounded-xl bg-white p-6 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-accent-cyan">
                    {group.channel}
                  </span>
                  <h3 className="mt-1 text-sm font-bold uppercase tracking-wide text-navy-deep">
                    {group.title}
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-cyan" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Applicant type */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <FadeIn>
            <div className="h-full rounded-xl border border-navy-deep/10 p-6">
              <h3 className="text-base font-bold uppercase tracking-wide text-navy-deep">
                IEB Member
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Provide your IEB Membership Number. The system verifies it against the
                competition database before your submission can be finalized.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <div className="h-full rounded-xl border border-navy-deep/10 p-6">
              <h3 className="text-base font-bold uppercase tracking-wide text-navy-deep">
                Student
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Provide your university name and university email. Your email must
                belong to an approved university domain to be verified.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Before you start checklist */}
      <section className="bg-navy-deep">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <FadeIn>
            <h2 className="text-sm font-bold uppercase tracking-[3px] text-accent-cyan">
              Before You Start
            </h2>
            <p className="mt-3 text-white/70">Make sure you have everything ready:</p>
            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/25 text-[11px]">
                    &nbsp;
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold uppercase tracking-wide text-navy-deep">
              Ready to submit your project?
            </h2>
            <p className="mt-3 text-gray-600">
              Start your submission to receive your unique Application ID.
            </p>
            {isAuthenticated && user && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent-cyan">
                Signed in as {user.fullName}
              </p>
            )}

            <div className="mt-8 flex flex-col items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartClick}
                disabled={starting || authLoading}
                className="rounded-lg bg-navy-deep px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-navy-deep/90 disabled:opacity-60"
              >
                {starting ? "Starting…" : "Start Submission"}
              </motion.button>

              {startError && (
                <p className="text-sm font-semibold text-red-600" role="alert">
                  {startError}
                </p>
              )}

              {showGuestPanel && !isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 w-full max-w-sm rounded-xl border border-navy-deep/10 bg-gray-50 p-6 text-left"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/60">
                    Continue as guest
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional — add an email so you can be reached about your submission.
                  </p>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-3 w-full rounded-lg border border-navy-deep/15 px-3 py-2 text-sm focus:border-accent-cyan focus:outline-none"
                  />
                  <button
                    onClick={() => beginSubmission(guestEmail || undefined)}
                    disabled={starting}
                    className="mt-3 w-full rounded-lg bg-accent-cyan px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-navy-ink hover:bg-accent-cyan/90 disabled:opacity-60"
                  >
                    {starting ? "Starting…" : "Continue as Guest"}
                  </button>
                  <p className="mt-4 text-center text-xs text-gray-500">
                    Already have an account?{" "}
                    <a href="/login" className="font-semibold text-accent-cyan hover:underline">
                      Sign in
                    </a>
                  </p>
                </motion.div>
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  );
}