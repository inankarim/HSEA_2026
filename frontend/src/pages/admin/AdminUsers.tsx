import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminUsers,
  resolveAdminMediaUrl,
  type AdminUserRow,
  AdminApiError,
} from "../../lib/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

const PAGE_SIZE = 25;

export default function AdminUsers() {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      const result = await adminUsers.list({
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await logout();
    navigate("/123456789/admin/login", { replace: true });
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    setActionError(null);
    try {
      const { temporaryPassword } = await adminUsers.resetPassword(resetTarget.id);
      setResetResult(temporaryPassword);
    } catch (err) {
      setActionError(err instanceof AdminApiError ? err.message : "Failed to reset password.");
    }
  }

  async function handleDelete(code: string) {
    if (!deleteTarget) return;
    await adminUsers.remove(deleteTarget.id, code);
    setDeleteTarget(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
            <button
            onClick={() => navigate("/123456789/admin")}
            className="text-left"
            >
            <span className="block text-xs font-bold uppercase tracking-wide text-navy-deep/50">
                HSEA 2026
            </span>
            <span className="block text-xl font-bold text-navy-deep hover:text-accent-cyan transition-colors">
                Registered Users
            </span>
            </button>
            <div className="flex items-center gap-4">
            <button
                onClick={() => navigate("/123456789/admin/submissions")}
                className="text-xs font-bold uppercase tracking-wide text-navy-deep/60 hover:underline"
            >
                Submissions
            </button>
            <button
                onClick={() => navigate("/123456789/admin/accounts")}
                className="text-xs font-bold uppercase tracking-wide text-navy-deep/60 hover:underline"
            >
                Admin Accounts
            </button>
            <p className="text-sm text-gray-500">{admin?.fullName}</p>
            <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-wide text-red-600 hover:underline">
                Log Out
            </button>
            </div>
        </div>
        </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <input
          type="text"
          placeholder="Search by name, email, IEB number, or university…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-navy-deep/15 px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none"
        />

        {actionError && <p className="mt-4 text-sm font-semibold text-red-600">{actionError}</p>}

        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-bold uppercase tracking-wide text-navy-deep/50">
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">IEB / University</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No users found.</td></tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {u.profilePhotoUrl ? (
                        <img
                          src={resolveAdminMediaUrl(u.profilePhotoUrl) || ""}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-navy-deep/10" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy-deep">{u.fullName}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.applicantType === "IAB_MEMBER" ? "IEB Member" : "Student"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.applicantType === "IAB_MEMBER"
                        ? u.iabMembershipNumber || "—"
                        : `${u.universityName || "—"}${u.universityEmail ? ` (${u.universityEmail})` : ""}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setResetTarget(u); setResetResult(null); }}
                          className="text-xs font-bold uppercase tracking-wide text-accent-cyan hover:underline"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="text-xs font-bold uppercase tracking-wide text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <p>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-navy-deep/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-40">Previous</button>
              <span className="px-2 py-1.5 text-xs font-bold text-navy-deep/60">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border border-navy-deep/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/60 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="text-lg font-bold text-navy-deep">Reset password for {resetTarget.fullName}</h3>
            {!resetResult ? (
              <>
                <p className="mt-2 text-sm text-gray-600">
                  This generates a new temporary password for this user. You'll need to share it
                  with them yourself — it cannot be recovered or shown again after this.
                </p>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setResetTarget(null)} className="flex-1 rounded-lg border border-navy-deep/15 py-2.5 text-sm font-bold uppercase tracking-wide text-navy-deep/70">
                    Cancel
                  </button>
                  <button onClick={handleResetPassword} className="flex-1 rounded-lg bg-navy-deep py-2.5 text-sm font-bold uppercase tracking-wide text-white">
                    Generate
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-600">Share this password with the user now — it will not be shown again:</p>
                <div className="mt-3 rounded-lg bg-gray-100 px-4 py-3 font-mono text-sm text-navy-deep select-all">
                  {resetResult}
                </div>
                <button onClick={() => setResetTarget(null)} className="mt-6 w-full rounded-lg bg-navy-deep py-2.5 text-sm font-bold uppercase tracking-wide text-white">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={`Delete ${deleteTarget.fullName}'s account?`}
          description="This permanently deletes the user's account. Their past submissions are kept but unlinked from their account. Enter the confirmation code to proceed."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}