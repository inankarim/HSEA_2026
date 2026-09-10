import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminSubmissions, type AdminSubmissionRow, AdminApiError } from "../../lib/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Shortlisted", value: "SHORTLISTED" },
  { label: "Finalist", value: "FINALIST" },
  { label: "Winner", value: "WINNER" },
  { label: "Rejected", value: "REJECTED" },
] as const;

const PAGE_SIZE = 25;

function statusBadgeClasses(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-600";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-700";
    case "UNDER_REVIEW":
      return "bg-amber-100 text-amber-700";
    case "SHORTLISTED":
    case "FINALIST":
      return "bg-purple-100 text-purple-700";
    case "WINNER":
      return "bg-emerald-100 text-emerald-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<AdminSubmissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input so we don't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminSubmissions.list({
        status: status || undefined,
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await logout();
    navigate("/123456789/admin/login", { replace: true });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate("/123456789/admin")}
            className="text-left"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-navy-deep/50">HSEA 2026</p>
            <h1 className="text-xl font-bold text-navy-deep hover:text-accent-cyan transition-colors">
              Admin Panel
            </h1>
          </button>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">{admin?.fullName}</p>
            <button
              onClick={handleLogout}
              className="text-xs font-bold uppercase tracking-wide text-red-600 hover:underline"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={[
                "rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
                status === tab.value
                  ? "bg-navy-deep text-white"
                  : "bg-white text-navy-deep/70 border border-navy-deep/15 hover:border-navy-deep/40",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mt-5">
          <input
            type="text"
            placeholder="Search by Application ID, name, email, or project name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-lg border border-navy-deep/15 px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-bold uppercase tracking-wide text-navy-deep/50">
                <th className="px-4 py-3">Application ID</th>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-red-600 font-semibold">
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    No submissions found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.application_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-navy-deep">{row.application_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-deep">{row.full_name || "—"}</p>
                      <p className="text-xs text-gray-400">{row.email || "no email yet"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-navy-deep">{row.project_name || "—"}</p>
                      <p className="text-xs text-gray-400">{row.project_category || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.applicant_type === "IAB_MEMBER" ? "IEB Member" : "Student"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusBadgeClasses(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-navy-deep">{row.document_count}</td>
                    <td className="px-4 py-3 text-center text-navy-deep">{row.member_count}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(row.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/123456789/admin/submissions/${row.application_id}`)}
                          className="text-xs font-bold uppercase tracking-wide text-accent-cyan hover:underline"
                        >
                          View
                        </button>
                        
                         <a href={adminSubmissions.downloadUrl(row.application_id)}
                          className="text-xs font-bold uppercase tracking-wide text-navy-deep hover:underline"
                        >
                          Download ZIP
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <p>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-navy-deep/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1.5 text-xs font-bold text-navy-deep/60">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-navy-deep/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}