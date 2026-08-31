import type {
  ApiFailure,
  IabVerificationResult,
  PublicUser,
  StartSubmissionResponse,
  Submission,
  SubmissionDraftPatch,
  SubmissionMember,
  MemberInput,
  UniversityVerificationResult,
} from "../types/Submission";

/**
 * Single source of truth for talking to the HSEA 2026 backend.
 * No mock data, no fake endpoints — every function here maps 1:1 to a
 * real route defined in routes/index.js on the backend.
 *
 * Auth is cookie-based (hsea_access_token / hsea_refresh_token, httpOnly,
 * set by the backend on login/register/refresh) so every request must be
 * sent with credentials: "include". Guest submissions instead rely on a
 * per-application bearer token sent via X-Guest-Access-Token.
 */

const BASE_URL = (import.meta as any).env?.VITE_API_URL || "";

/**
 * The backend returns upload URLs (profile photos, etc.) as paths relative
 * to itself, e.g. "/uploads/images/profile-photos/xxx.jpg" — it has no way
 * to know what origin the frontend is being served from. In dev, frontend
 * (Vite, e.g. :5173) and backend (Express, e.g. :4000) are usually
 * different origins, so an <img src="/uploads/..."> would resolve against
 * the *frontend's* origin and 404. Always resolve stored media URLs through
 * this helper (never render them raw) so they work in dev and in any prod
 * setup where the API isn't served from the same origin as the frontend.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return `${BASE_URL}${url}`;
}

export class ApiError extends Error {
  status: number;
  errors: ApiFailure["errors"];

  constructor(
    message: string,
    status: number,
    errors: ApiFailure["errors"] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

// --- guest access token storage -----------------------------------------
// Never put this in the URL, never log it. sessionStorage keeps it off
// disk and scoped to the tab; it is only ever sent as a request header.
const guestTokenKey = (applicationId: string) =>
  `hsea:guestToken:${applicationId}`;

export function storeGuestAccessToken(applicationId: string, token: string) {
  try {
    sessionStorage.setItem(guestTokenKey(applicationId), token);
  } catch {
    // sessionStorage unavailable (e.g. private mode) — the guest simply
    // won't be able to resume this draft in a new tab/session.
  }
}

export function getGuestAccessToken(applicationId: string): string | null {
  try {
    return sessionStorage.getItem(guestTokenKey(applicationId));
  } catch {
    return null;
  }
}

export function clearGuestAccessToken(applicationId: string) {
  try {
    sessionStorage.removeItem(guestTokenKey(applicationId));
  } catch {
    // no-op
  }
}

// --- low-level request helper -------------------------------------------

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  guestToken?: string | null;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (opts.guestToken) {
    headers["X-Guest-Access-Token"] = opts.guestToken;
  }
  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: opts.method || "GET",
      credentials: "include",
      headers,
      body,
      signal: opts.signal,
    });
  } catch (err) {
    throw new ApiError(
      "Couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  let json: ApiFailure | { success: true; data: T; message: string } | null =
    null;
  try {
    json = await response.json();
  } catch {
    // No JSON body (e.g. a 503 from the timeout middleware could still be JSON,
    // but be defensive regardless).
  }

  if (!response.ok || !json || json.success === false) {
    const message =
      (json && "message" in json && json.message) ||
      "The request took too long or failed. Please try again.";
    const errors = (json && "errors" in json && json.errors) || [];
    throw new ApiError(message, response.status, errors);
  }

  return (json as { data: T }).data;
}

/**
 * Low-level multipart/form-data POST, used only by upload endpoints.
 * Deliberately separate from request(): file uploads must NOT set a
 * Content-Type header themselves — the browser needs to generate the
 * multipart boundary — whereas request() always sends JSON.
 */
async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  let json: ApiFailure | { success: true; data: T; message: string } | null =
    null;
  try {
    json = await response.json();
  } catch {
    // no-op — handled by the !json check below
  }

  if (!response.ok || !json || json.success === false) {
    const message =
      (json && "message" in json && json.message) ||
      "The upload failed. Please try again.";
    const errors = (json && "errors" in json && json.errors) || [];
    throw new ApiError(message, response.status, errors);
  }

  return (json as { data: T }).data;
}

// --- auth ----------------------------------------------------------------

export const auth = {
  me: () => request<{ user: PublicUser }>("/api/auth/me"),

  login: (email: string, password: string) =>
    request<{ user: PublicUser }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  logout: () =>
    request<Record<string, never>>("/api/auth/logout", { method: "POST" }),

  register: (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    organization?: string;
    designation?: string;
    applicantType: "IAB_MEMBER" | "STUDENT";
    iabMembershipNumber?: string;
    universityName?: string;
    universityEmail?: string;
  }) =>
    request<{ user: PublicUser }>("/api/auth/register", {
      method: "POST",
      body: input,
    }),
};

// --- profile ---------------------------------------------------------------

const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2MB — mirrors the backend
// limit. This is a fast, friendly client-side pre-check only; the backend
// (multer + pictureUpload.service.js) is always the source of truth.

const PROFILE_PHOTO_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const profile = {
  /**
   * Uploads a profile photo (JPEG, PNG, or WebP — the backend always
   * re-encodes to JPEG for storage). Throws ApiError with a friendly
   * message on anything the backend rejects (wrong type, too large,
   * corrupt/invalid image, rate-limited, etc.) — callers don't need to
   * duplicate validation.
   */
  uploadPhoto: (file: File) => {
    if (!PROFILE_PHOTO_ACCEPTED_TYPES.includes(file.type)) {
      return Promise.reject(
        new ApiError("Please choose a JPEG, PNG, or WebP photo.", 0),
      );
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      return Promise.reject(
        new ApiError("That photo is too large. Maximum size is 2MB.", 0),
      );
    }
    const formData = new FormData();
    formData.append("photo", file);
    return uploadRequest<{ user: PublicUser }>("/api/profile/photo", formData);
  },
};

// --- submissions -----------------------------------------------------------

export const submissions = {
  start: (guestEmail?: string) =>
    request<StartSubmissionResponse>("/api/submissions/start", {
      method: "POST",
      body: guestEmail ? { guestEmail } : undefined,
    }),

  get: (applicationId: string, guestToken?: string | null) =>
    request<{ submission: Submission }>(`/api/submissions/${applicationId}`, {
      guestToken,
    }),

  updateDraft: (
    applicationId: string,
    patch: SubmissionDraftPatch,
    guestToken?: string | null,
  ) =>
    request<{ submission: Submission }>(`/api/submissions/${applicationId}`, {
      method: "PUT",
      body: patch,
      guestToken,
    }),

  submitFinal: (
    applicationId: string,
    guestToken?: string | null,
    idempotencyKey?: string,
  ) =>
    request<{ submission: Submission }>(
      `/api/submissions/${applicationId}/submit`,
      { method: "POST", guestToken, idempotencyKey },
    ),
};

// --- team members ----------------------------------------------------------

export const members = {
  list: (applicationId: string, guestToken?: string | null) =>
    request<{ members: SubmissionMember[] }>(
      `/api/submissions/${applicationId}/members`,
      { guestToken },
    ),

  add: (
    applicationId: string,
    input: MemberInput,
    guestToken?: string | null,
  ) =>
    request<{ member: SubmissionMember }>(
      `/api/submissions/${applicationId}/members`,
      { method: "POST", body: input, guestToken },
    ),

  remove: (
    applicationId: string,
    memberId: string,
    guestToken?: string | null,
  ) =>
    request<Record<string, never>>(
      `/api/submissions/${applicationId}/members/${memberId}`,
      { method: "DELETE", guestToken },
    ),
};

// --- verification ----------------------------------------------------------

export const verification = {
  iab: (membershipNumber: string) =>
    request<IabVerificationResult>(
      `/api/iab/verify/${encodeURIComponent(membershipNumber)}`,
    ),

  universityEmail: (email: string) =>
    request<UniversityVerificationResult>(
      `/api/universities/verify-email-domain?email=${encodeURIComponent(email)}`,
    ),
};

/** Generates a fresh Idempotency-Key for one final-submit attempt. */
export function newIdempotencyKey() {
  return crypto.randomUUID();
}
