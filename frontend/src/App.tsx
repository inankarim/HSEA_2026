import { useEffect, useRef, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import CookieConsentBanner from "./components/CookieConsentBanner";
import { trackPixelEvent } from "./lib/pixel";
import { SESSION_EXPIRED_EVENT } from "./lib/api";
import { useAuth } from "./context/AuthContext";

// --- Public site pages: lazy-loaded, each becomes its own chunk ---
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Detailsawards = lazy(() => import("./components/Detailsawards"));
const Awardcategories = lazy(() => import("./components/AwardCat"));
const EligibilityCriteria = lazy(() => import("./components/EligibilityCriteria"));
const AwardsPrize = lazy(() => import("./components/AwardsPrize"));
const AwardsPrize2 = lazy(() => import("./components/AwardsPrize2"));
const JuryPage = lazy(() => import("./pages/JuryPage"));
const SubmissionInstructions = lazy(() => import("./pages/Submissioninstructions"));
const SubmissionPortal = lazy(() => import("./pages/Submissionportal"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

const NotFound = lazy(() => import("./pages/NotFound"));

// Admin panel lives in its own bundle now (admin.html / admin-main.tsx /
// AdminApp.tsx) — see that file's comment for why. Nothing admin-related
// is imported here anymore, so none of it ships in this bundle.

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

function usePageViews() {
  const location = useLocation();
  const isFirstRoute = useRef(true);
  useEffect(() => {
    // The pixel loader already sends PageView for the landing page, so only
    // in-app navigations need one here.
    if (isFirstRoute.current) isFirstRoute.current = false;
    else trackPixelEvent("PageView");

    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) return;
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
}

// Pages that need a signed-in user; if the session can't be renewed there,
// send the user to Sign In and bring them back afterwards.
const SIGNED_IN_PAGES = ["/submission/", "/profile", "/submit"];

function useSessionExpiryRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();

  useEffect(() => {
    function onExpired() {
      const path = location.pathname;
      if (!SIGNED_IN_PAGES.some((p) => path.startsWith(p))) return;
      refresh();
      navigate("/login", { state: { from: path, reason: "expired" }, replace: true });
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [navigate, location.pathname, refresh]);
}

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm font-semibold uppercase tracking-wide text-navy-deep/50">
        Loading…
      </p>
    </div>
  );
}

function App() {
  usePageViews();
  useSessionExpiryRedirect();

  return (
    <>
      <CookieConsentBanner />
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/awards/about" element={<Detailsawards />} />
        <Route path="/awards/categories" element={<Awardcategories />} />
        <Route path="/awards/eligibility" element={<EligibilityCriteria />} />
        <Route path="/awards/prize" element={<AwardsPrize />} />
        <Route path="/awards/prize2" element={<AwardsPrize2 />} />
        <Route path="/jury" element={<JuryPage />} />
        <Route path="/about" element={<Navigate to="/dashboard" replace />} />
        <Route path="/submit" element={<SubmissionInstructions />} />
        <Route path="/submission/:applicationId" element={<SubmissionPortal />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default App;