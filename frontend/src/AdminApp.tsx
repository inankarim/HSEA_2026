import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import AdminRouteGuard from "./pages/admin/AdminRouteGuard";

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminChangePassword = lazy(() => import("./pages/admin/AdminChangePassword"));
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const AdminSubmissionDetail = lazy(() => import("./pages/admin/AdminSubmissionDetail"));
const AdminMain = lazy(() => import("./pages/admin/AdminMain"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAccounts = lazy(() => import("./pages/admin/AdminAccounts"));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm font-semibold uppercase tracking-wide text-navy-deep/50">
        Loading…
      </p>
    </div>
  );
}

// Standalone router for the admin panel's own bundle (admin.html /
// admin-main.tsx) — deliberately not part of App.tsx's route tree, so none
// of these paths or admin-only components ever ship in the public site's
// JavaScript. Path strings are unchanged from the previous nested-route
// setup so every existing absolute Navigate/Link reference
// ("/123456789/admin/...") elsewhere in the admin pages keeps working
// without modification.
export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/123456789/admin/login" element={<AdminLogin />} />
          <Route
            path="/123456789/admin"
            element={
              <AdminRouteGuard>
                <AdminMain />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/123456789/admin/submissions"
            element={
              <AdminRouteGuard>
                <AdminPanel />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/123456789/admin/submissions/:applicationId"
            element={
              <AdminRouteGuard>
                <AdminSubmissionDetail />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/123456789/admin/change-password"
            element={
              <AdminRouteGuard>
                <AdminChangePassword />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/123456789/admin/users"
            element={
              <AdminRouteGuard>
                <AdminUsers />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/123456789/admin/accounts"
            element={
              <AdminRouteGuard>
                <AdminAccounts />
              </AdminRouteGuard>
            }
          />
        </Routes>
      </Suspense>
    </AdminAuthProvider>
  );
}
