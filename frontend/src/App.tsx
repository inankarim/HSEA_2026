import { useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import AdminRouteGuard from "./pages/admin/AdminRouteGuard";

// --- Public site pages: lazy-loaded, each becomes its own chunk ---
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Detailsawards = lazy(() => import("./components/Detailsawards"));
const Awardcategories = lazy(() => import("./components/AwardCat"));
const JuryPage = lazy(() => import("./pages/JuryPage"));
const SubmissionInstructions = lazy(() => import("./pages/Submissioninstructions"));
const SubmissionPortal = lazy(() => import("./pages/Submissionportal"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const GeneralInfo = lazy(() => import("./pages/GeneralInfo"));
const WinnersInfo = lazy(() => import("./pages/WinnersInfo"));
const NotFound = lazy(() => import("./pages/NotFound"));

// --- Admin pages: separate chunk group ---
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminChangePassword = lazy(() => import("./pages/admin/AdminChangePassword"));
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const AdminSubmissionDetail = lazy(() => import("./pages/admin/AdminSubmissionDetail"));
const AdminMain = lazy(() => import("./pages/admin/AdminMain"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAccounts = lazy(() => import("./pages/admin/AdminAccounts"));

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

function usePageViews() {
  const location = useLocation();
  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) return;
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
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

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/awards/about" element={<Detailsawards />} />
        <Route path="/awards/categories" element={<Awardcategories />} />
        <Route path="/awards/general" element={<GeneralInfo />} />
        <Route path="/winners" element={<WinnersInfo />} />
        <Route path="/jury" element={<JuryPage />} />
        <Route path="/about" element={<Navigate to="/dashboard" replace />} />
        <Route path="/submit" element={<SubmissionInstructions />} />
        <Route path="/submission/:applicationId" element={<SubmissionPortal />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
        <Route
          path="/123456789/admin/*"
          element={
            <AdminAuthProvider>
              <Routes>
                <Route path="login" element={<AdminLogin />} />
                <Route
                  path=""
                  element={
                    <AdminRouteGuard>
                      <AdminMain />
                    </AdminRouteGuard>
                  }
                />
                <Route
                  path="submissions"
                  element={
                    <AdminRouteGuard>
                      <AdminPanel />
                    </AdminRouteGuard>
                  }
                />
                <Route
                  path="submissions/:applicationId"
                  element={
                    <AdminRouteGuard>
                      <AdminSubmissionDetail />
                    </AdminRouteGuard>
                  }
                />
                <Route
                  path="change-password"
                  element={
                    <AdminRouteGuard>
                      <AdminChangePassword />
                    </AdminRouteGuard>
                  }
                />
                <Route path="users" element={<AdminRouteGuard><AdminUsers /></AdminRouteGuard>} />
                <Route path="accounts" element={<AdminRouteGuard><AdminAccounts /></AdminRouteGuard>} />
              </Routes>
            </AdminAuthProvider>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;