import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { adminAdmins, type AdminAccountRow, AdminApiError } from "../../lib/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

export default function AdminAccounts() {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();

  const [rows, setRows] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAccountRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { admins } = await adminAdmins.list();
      setRows(admins);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load admin accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    await logout();
    navigate("/123456789/admin/login", { replace: true });
  }

  async function handleDelete(code: string) {
    if (!deleteTarget) return;
    await adminAdmins.remove(deleteTarget.id, code);
    setDeleteTarget(null);
    load();
  }

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
                Admin Accounts
            </span>
            </button>
            <div className="flex items-center gap-4">
            <button onClick={() => navigate("/123456789/admin/users")} className="text-xs font-bold uppercase tracking-wide text-navy-deep/60 hover:underline">
                Users
            </button>
            <button onClick={() => navigate("/123456789/admin/submissions")} className="text-xs font-bold uppercase tracking-wide text-navy-deep/60 hover:underline">
                Submissions
            </button>
            <p className="text-sm text-gray-500">{admin?.fullName}</p>
            <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-wide text-red-600 hover:underline">
                Log Out
            </button>
            </div>
        </div>
        </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-bold uppercase tracking-wide text-navy-deep/50">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-navy-deep">
                      {a.fullName} {a.id === admin?.id && <span className="text-xs text-accent-cyan">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {a.id !== admin?.id ? (
                        <button onClick={() => setDeleteTarget(a)} className="text-xs font-bold uppercase tracking-wide text-red-600 hover:underline">
                          Delete
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          title={`Delete ${deleteTarget.fullName}'s admin account?`}
          description="This permanently revokes their admin access. Enter the confirmation code to proceed."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}