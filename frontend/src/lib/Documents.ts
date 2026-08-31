import { ApiError } from "./api";
import type { DocumentType, MemberDocumentType, SubmissionDocument } from "../types/Document";

// Mirrors the BASE_URL / envelope conventions in lib/api.ts exactly —
// kept in a separate module only because uploads need XHR (for progress
// events), which request() in api.ts doesn't support.
const BASE_URL = (import.meta as any).env?.VITE_API_URL || "";

const GUEST_TOKEN_HEADER = "x-guest-access-token";

type Envelope<T> =
  | { success: true; data: T; message: string }
  | {
      success: false;
      message: string;
      errors: Array<{ field?: string; message: string }>;
    };

async function jsonRequest<T>(
  path: string,
  opts: { method?: string; guestToken?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.guestToken) headers[GUEST_TOKEN_HEADER] = opts.guestToken;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: opts.method || "GET",
      credentials: "include",
      headers,
    });
  } catch {
    throw new ApiError(
      "Couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  let json: Envelope<T> | null = null;
  try {
    json = await response.json();
  } catch {
    // handled by the check below
  }

  if (!response.ok || !json || json.success === false) {
    const message =
      (json && "message" in json && json.message) ||
      "The request failed. Please try again.";
    const errors = (json && "errors" in json && json.errors) || [];
    throw new ApiError(message, response.status, errors);
  }

  return (json as { data: T }).data;
}

/**
 * Shared XHR upload helper (used by both `documents.upload` and
 * `memberDocuments.upload`) so progress events, envelope handling, and
 * guest-token headers stay identical between the two.
 */
function xhrUpload<T>(
  url: string,
  file: File,
  opts: {
    guestToken?: string | null;
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
  },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    if (opts.guestToken) {
      xhr.setRequestHeader(GUEST_TOKEN_HEADER, opts.guestToken);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && opts.onProgress) {
        opts.onProgress(event.loaded / event.total);
      }
    };

    xhr.onerror = () => {
      reject(
        new ApiError(
          "Couldn't reach the server. Check your connection and try again.",
          0,
        ),
      );
    };

    xhr.onabort = () => {
      reject(new ApiError("Upload cancelled.", 0));
    };

    xhr.onload = () => {
      let json: Envelope<T> | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // handled below
      }
      if (xhr.status >= 200 && xhr.status < 300 && json && json.success) {
        resolve((json as { data: T }).data);
      } else {
        const message =
          (json && "message" in json && json.message) ||
          "Upload failed. Please try again.";
        const errors = (json && "errors" in json && json.errors) || [];
        reject(new ApiError(message, xhr.status, errors));
      }
    };

    if (opts.signal) {
      opts.signal.addEventListener("abort", () => xhr.abort());
    }

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}

export const documents = {
  list: (applicationId: string, guestToken?: string | null) =>
    jsonRequest<{ documents: SubmissionDocument[] }>(
      `/api/submissions/${applicationId}/documents`,
      { guestToken },
    ),

  remove: (
    applicationId: string,
    documentType: DocumentType,
    guestToken?: string | null,
  ) =>
    jsonRequest<Record<string, never>>(
      `/api/submissions/${applicationId}/documents/${documentType}`,
      { method: "DELETE", guestToken },
    ),

  downloadUrl: (applicationId: string, documentType: DocumentType) =>
    `${BASE_URL}/api/submissions/${applicationId}/documents/${documentType}/download`,

  /**
   * Uploads one file with real progress events. Uses XMLHttpRequest
   * instead of fetch() specifically because fetch has no standardized
   * upload-progress API — everything else about this call (envelope
   * shape, credentials, guest token header) matches lib/api.ts.
   */
  upload(
    applicationId: string,
    documentType: DocumentType,
    file: File,
    opts: {
      guestToken?: string | null;
      onProgress?: (fraction: number) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<SubmissionDocument> {
    return xhrUpload<{ document: SubmissionDocument }>(
      `${BASE_URL}/api/submissions/${applicationId}/documents/${documentType}`,
      file,
      opts,
    ).then((data) => data.document);
  },
};

/**
 * Per-team-member documents (NID + Photo). Every function takes a
 * `memberId` in addition to `applicationId` — the backend re-validates
 * that the member actually belongs to that application on every call, so
 * member 1's documents can never be attributed to member 2 even if the
 * frontend somehow sent the wrong id.
 */
export const memberDocuments = {
  list: (applicationId: string, memberId: string, guestToken?: string | null) =>
    jsonRequest<{ documents: SubmissionDocument[] }>(
      `/api/submissions/${applicationId}/members/${memberId}/documents`,
      { guestToken },
    ),

  remove: (
    applicationId: string,
    memberId: string,
    documentType: MemberDocumentType,
    guestToken?: string | null,
  ) =>
    jsonRequest<Record<string, never>>(
      `/api/submissions/${applicationId}/members/${memberId}/documents/${documentType}`,
      { method: "DELETE", guestToken },
    ),

  downloadUrl: (
    applicationId: string,
    memberId: string,
    documentType: MemberDocumentType,
  ) =>
    `${BASE_URL}/api/submissions/${applicationId}/members/${memberId}/documents/${documentType}/download`,

  upload(
    applicationId: string,
    memberId: string,
    documentType: MemberDocumentType,
    file: File,
    opts: {
      guestToken?: string | null;
      onProgress?: (fraction: number) => void;
      signal?: AbortSignal;
    } = {},
  ): Promise<SubmissionDocument> {
    return xhrUpload<{ document: SubmissionDocument }>(
      `${BASE_URL}/api/submissions/${applicationId}/members/${memberId}/documents/${documentType}`,
      file,
      opts,
    ).then((data) => data.document);
  },
};
