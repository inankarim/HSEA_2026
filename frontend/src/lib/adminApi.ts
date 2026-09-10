const BASE_URL = (import.meta as any).env?.VITE_API_URL || "";

export class AdminApiError extends Error {
  status: number;
  errors: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    status: number,
    errors: Array<{ field?: string; message: string }> = [],
  ) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.errors = errors;
  }
}

type Envelope<T> =
  | { success: true; data: T; message: string }
  | {
      success: false;
      message: string;
      errors: Array<{ field?: string; message: string }>;
    };

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: opts.method || "GET",
      credentials: "include", // sends hsea_admin_token cookie
      headers,
      body,
    });
  } catch {
    throw new AdminApiError(
      "Couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  let json: Envelope<T> | null = null;
  try {
    json = await response.json();
  } catch {
    // handled below
  }

  if (!response.ok || !json || json.success === false) {
    const message =
      (json && "message" in json && json.message) ||
      "The request failed. Please try again.";
    const errors = (json && "errors" in json && json.errors) || [];
    throw new AdminApiError(message, response.status, errors);
  }

  return (json as { data: T }).data;
}

// --- types ----------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  mustChangePassword: boolean;
}

export interface AdminSubmissionRow {
  application_id: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "SHORTLISTED"
    | "FINALIST"
    | "WINNER"
    | "REJECTED";
  applicant_type: "IAB_MEMBER" | "STUDENT";
  full_name: string | null;
  email: string | null;
  project_name: string | null;
  project_category: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  document_count: number;
  member_count: number;
}

export interface AdminSubmissionListResult {
  rows: AdminSubmissionRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminDocumentView {
  id: string;
  documentType: string;
  memberId?: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadStatus: "UPLOADING" | "UPLOADED" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

export interface AdminMember {
  id: string;
  full_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  applicant_type: "IAB_MEMBER" | "STUDENT" | null;
  iab_membership_number: string | null;
  iab_verification_status: string;
  university_name: string | null;
  university_email: string | null;
  university_verification_status: string;
  is_team_leader: boolean;
}

export interface AdminSubmissionDetail {
  submission: Record<string, any>; // raw DB row — see AdminSubmissionView.tsx for the fields we render
  members: AdminMember[];
  documents: AdminDocumentView[];
  memberDocuments: AdminDocumentView[];
}

// --- api --------------------------------------------------------------

export const adminAuth = {
  login: (email: string, password: string) =>
    request<{ admin: AdminUser }>("/api/admin/login", {
      method: "POST",
      body: { email, password },
    }),

  logout: () =>
    request<Record<string, never>>("/api/admin/logout", { method: "POST" }),

  me: () => request<{ admin: AdminUser }>("/api/admin/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<Record<string, never>>("/api/admin/password", {
      method: "PUT",
      body: { currentPassword, newPassword },
    }),
};

export const adminSubmissions = {
  list: (params: {
    status?: string;
    search?: string;
    applicantType?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    if (params.applicantType) query.set("applicantType", params.applicantType);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return request<AdminSubmissionListResult>(
      `/api/admin/submissions${qs ? `?${qs}` : ""}`,
    );
  },

  detail: (applicationId: string) =>
    request<AdminSubmissionDetail>(`/api/admin/submissions/${applicationId}`),
  updateStatus: (applicationId: string, status: string) =>
    request<{ application_id: string; status: string }>(
      `/api/admin/submissions/${applicationId}/status`,
      { method: "PUT", body: { status } },
    ),
  downloadUrl: (applicationId: string) =>
    `${BASE_URL}/api/admin/submissions/${applicationId}/download`,
};
export interface AdminKpis {
  totalApplicants: number;
  totalSubmitted: number;
  totalUsers: number;
  totalViews: number | null;
  totalVisitors: number | null;
}

export const adminKpis = {
  get: () => request<AdminKpis>("/api/admin/kpis"),
};

export function resolveAdminMediaUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  )
    return url;
  return `${BASE_URL}${url}`;
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  organization: string | null;
  designation: string | null;
  applicantType: "IAB_MEMBER" | "STUDENT";
  iabMembershipNumber: string | null;
  universityName: string | null;
  universityEmail: string | null;
  profilePhotoUrl: string | null;
  createdAt: string;
}

export interface AdminUserListResult {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminAccountRow {
  id: string;
  email: string;
  fullName: string;
  mustChangePassword: boolean;
  createdAt: string;
}

export const adminUsers = {
  list: (params: { search?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    const qs = query.toString();
    return request<AdminUserListResult>(
      `/api/admin/users${qs ? `?${qs}` : ""}`,
    );
  },
  detail: (userId: string) =>
    request<{ user: AdminUserRow }>(`/api/admin/users/${userId}`),
  resetPassword: (userId: string) =>
    request<{ temporaryPassword: string }>(
      `/api/admin/users/${userId}/reset-password`,
      {
        method: "POST",
      },
    ),
  remove: (userId: string, code: string) =>
    request<Record<string, never>>(`/api/admin/users/${userId}`, {
      method: "DELETE",
      body: { code },
    }),
};

export const adminAdmins = {
  list: () => request<{ admins: AdminAccountRow[] }>("/api/admin/admins"),
  remove: (adminId: string, code: string) =>
    request<Record<string, never>>(`/api/admin/admins/${adminId}`, {
      method: "DELETE",
      body: { code },
    }),
};
