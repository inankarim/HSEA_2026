import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth } from "../lib/api";
import type { PublicUser } from "../types/Submission";

type AuthContextValue = {
  user: PublicUser | null;
  isAuthenticated: boolean;
  /** True only while the initial /api/auth/me check is in flight. */
  loading: boolean;
  /** Re-checks /api/auth/me — call after login/register/logout. */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Wraps the app so every page shares one auth check instead of each page
 * calling GET /api/auth/me independently. Auth state itself always comes
 * from the backend's httpOnly session cookie — this context only caches
 * the result of asking it "who am I", it never decides identity on its own.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await auth.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // Cookie may already be gone / network hiccup — clear local state
      // regardless so the UI never gets stuck showing a stale session.
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: Boolean(user), loading, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}