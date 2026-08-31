import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/apiResponse.js";
import { receiveDocumentUpload } from "../middleware/Documentupload.middleware.js";
import {
  uploadDocument,
  listDocuments,
  removeDocument,
  getDocumentStream,
  uploadMemberDocument,
  listMemberDocuments,
  removeMemberDocument,
  getMemberDocumentStream,
} from "../services/document.service.js";

// Same header/convention submission.controller.js already uses for guest
// draft access — no second auth mechanism introduced here.
const GUEST_TOKEN_HEADER = "x-guest-access-token";

function guestTokenFrom(req) {
  const header = req.headers[GUEST_TOKEN_HEADER];
  return typeof header === "string" ? header : undefined;
}

function authFrom(req) {
  return { userId: req.user?.id, guestToken: guestTokenFrom(req) };
}

function sendAsDownload(res, stream, document) {
  // application/octet-stream + attachment regardless of the document's
  // real mime type: this is an applicant-supplied file, not something we
  // want the browser ever treating as renderable/executable content
  // in-line. Forcing a download is the safe default for untrusted
  // uploaded content.
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${document.originalFilename.replace(/["\r\n]/g, "_")}"`,
  );
  res.setHeader("X-Content-Type-Options", "nosniff");

  stream.on("error", (err) => {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to read document.",
        errors: [],
      });
    } else {
      res.destroy(err);
    }
  });
  stream.pipe(res);
}

// --- application-wide documents (unchanged) -----------------------------

export const list = asyncHandler(async (req, res) => {
  const documents = await listDocuments(
    req.params.applicationId,
    authFrom(req),
  );
  return ok(res, { documents });
});

export const upload = asyncHandler(async (req, res) => {
  // multer (disk storage — see documentUpload.middleware.js) runs first,
  // populating req.file with a path under STORAGE_TEMP_DIR. Nothing here
  // ever holds the full file in a Buffer.
  await receiveDocumentUpload(req, res);

  const document = await uploadDocument(
    req.params.applicationId,
    req.params.documentType,
    req.file,
    authFrom(req),
  );
  return created(res, { document }, "Document uploaded.");
});

export const remove = asyncHandler(async (req, res) => {
  await removeDocument(
    req.params.applicationId,
    req.params.documentType,
    authFrom(req),
  );
  return ok(res, {}, "Document removed.");
});

export const download = asyncHandler(async (req, res) => {
  const { stream, document } = await getDocumentStream(
    req.params.applicationId,
    req.params.documentType,
    authFrom(req),
  );
  sendAsDownload(res, stream, document);
});

// --- per-team-member documents (NEW) -------------------------------------

export const listMember = asyncHandler(async (req, res) => {
  const documents = await listMemberDocuments(
    req.params.applicationId,
    req.params.memberId,
    authFrom(req),
  );
  return ok(res, { documents });
});

export const uploadMember = asyncHandler(async (req, res) => {
  await receiveDocumentUpload(req, res);

  const document = await uploadMemberDocument(
    req.params.applicationId,
    req.params.memberId,
    req.params.documentType,
    req.file,
    authFrom(req),
  );
  return created(res, { document }, "Document uploaded.");
});

export const removeMember = asyncHandler(async (req, res) => {
  await removeMemberDocument(
    req.params.applicationId,
    req.params.memberId,
    req.params.documentType,
    authFrom(req),
  );
  return ok(res, {}, "Document removed.");
});

export const downloadMember = asyncHandler(async (req, res) => {
  const { stream, document } = await getMemberDocumentStream(
    req.params.applicationId,
    req.params.memberId,
    req.params.documentType,
    authFrom(req),
  );
  sendAsDownload(res, stream, document);
});
