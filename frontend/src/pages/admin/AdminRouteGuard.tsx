import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { admin, isAuthenticated, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-deep">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/50">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated || !admin) {
    return <Navigate to="/123456789/admin/login" state={{ from: location.pathname }} replace />;
  }

  const onChangePasswordPage = location.pathname.endsWith("/change-password");
  if (admin.mustChangePassword && !onChangePasswordPage) {
    return <Navigate to="/123456789/admin/change-password" replace />;
  }

  return <>{children}</>;
}