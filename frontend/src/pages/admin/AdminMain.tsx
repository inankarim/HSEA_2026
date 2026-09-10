import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminKpis, type AdminKpis as AdminKpisType, AdminApiError } from "../../lib/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

function formatNumber(value: number | null): string {
  if (value === null) return "N/A";
  return value.toLocaleString();
}

function KpiCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">{label}</p>
      <p className="mt-2 text-4xl font-bold text-navy-deep">
        {loading ? <span className="text-gray-300">…</span> : value}
      </p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  onClick,
  variant = "light",
}: {
  title: string;
  description: string;
  onClick: () => void;
  variant?: "dark" | "light";
}) {
  const isDark = variant === "dark";
  return (
    <button
      onClick={onClick}
      className={[
        "group flex flex-col items-start rounded-xl p-6 text-left transition-all",
        isDark
          ? "bg-navy-deep text-white hover:bg-navy-deep/90"
          : "border border-navy-deep/15 bg-white text-navy-deep hover:border-navy-deep/40 hover:shadow-md",
      ].join(" ")}
    >
      <p className="text-sm font-bold uppercase tracking-wide">{title}</p>
      <p className={`mt-1 text-xs ${isDark ? "text-white/70" : "text-navy-deep/50"}`}>{description}</p>
      <span
        className={[
          "mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide transition-transform group-hover:translate-x-1",
          isDark ? "text-accent-cyan" : "text-accent-cyan",
        ].join(" ")}
      >
        Go →
      </span>
    </button>
  );
}

export default function AdminMain() {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();

  const [kpis, setKpis] = useState<AdminKpisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminKpis
      .get()
      .then(setKpis)
      .catch((err) => setError(err instanceof AdminApiError ? err.message : "Failed to load stats."))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/123456789/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">HSEA 2026</p>
            <h1 className="text-xl font-bold text-navy-deep">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">{admin?.fullName}</p>
            <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-wide text-red-600 hover:underline">
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Hero banner — short height, gradient, no external image dependency */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-r from-navy-deep to-navy-deep/80 sm:h-32">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 60%, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative mx-auto flex h-full max-w-7xl items-center px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accent-cyan">Welcome back{admin?.fullName ? `, ${admin.fullName.split(" ")[0]}` : ""}</p>
            <p className="mt-1 text-lg font-bold text-white sm:text-xl">Here's what's happening with HSEA 2026</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <KpiCard label="Total Applicants" value={formatNumber(kpis?.totalApplicants ?? 0)} loading={loading} />
          <KpiCard label="Total Submitted" value={formatNumber(kpis?.totalSubmitted ?? 0)} loading={loading} />
          <KpiCard label="Total Users" value={formatNumber(kpis?.totalUsers ?? 0)} loading={loading} />
          <KpiCard label="Total Views (GA4)" value={formatNumber(kpis?.totalViews ?? null)} loading={loading} />
          <KpiCard label="Total Visitors (GA4)" value={formatNumber(kpis?.totalVisitors ?? null)} loading={loading} />
        </div>

       <div className="mt-10">
  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-navy-deep/50">Quick actions</p>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <ActionCard
      title="📄 View Submissions"
      description="Browse, search, and review applicant submissions"
      onClick={() => navigate("/123456789/admin/submissions")}
      variant="dark"
    />
    <ActionCard
      title="👥 Manage Users"
      description="View and manage registered users"
      onClick={() => navigate("/123456789/admin/users")}
    />
    <ActionCard
      title="🛡️ Manage Admin Accounts"
      description="Add, edit, or remove admin access"
      onClick={() => navigate("/123456789/admin/accounts")}
    />
  </div>
</div>
      </div>
    </div>
  );
}