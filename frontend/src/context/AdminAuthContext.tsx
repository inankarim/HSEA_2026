import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { adminAuth, type AdminUser } from "../lib/adminApi";

type AdminAuthContextValue = {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

/**
 * Entirely separate from AuthContext (applicant auth). Backed by its own
 * cookie (hsea_admin_token) and its own /api/admin/me check — an admin
 * session and an applicant session never share state, even if both are
 * open in the same browser.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { admin } = await adminAuth.me();
      setAdmin(admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await adminAuth.logout();
    } catch {
      // cookie may already be gone — clear local state regardless
    } finally {
      setAdmin(null);
    }
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ admin, isAuthenticated: Boolean(admin), loading, refresh, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  }
  return ctx;
}