import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Local/on-premise filesystem storage for applicant documents.
 *
 * Layout under `root`:
 *   <root>/tmp/<random>.part                         — in-flight uploads
 *   <root>/applicants/<applicationId>/<type>.<random><ext>  — committed files
 *
 * Design notes:
 *   - The client never supplies a filesystem path. Every path this class
 *     touches is either generated here (crypto.randomUUID()) or resolved
 *     through _resolveStoragePath(), which refuses anything that escapes
 *     `root` after resolution (blocks "../", encoded traversal, absolute
 *     paths passed as a "relative" storagePath, etc.).
 *   - commit() does a rename() (same-filesystem move), which is atomic on
 *     POSIX filesystems — there is never a window where a half-written
 *     file exists at the destination path. If root and tmp end up on
 *     different filesystems/mounts, rename() fails with EXDEV and we fall
 *     back to copy-then-unlink, which is not atomic; operators should
 *     keep STORAGE_ROOT and STORAGE_TEMP_DIR on the same volume in
 *     production to avoid that fallback path entirely.
 *   - Every applicant's files live under their own applicationId
 *     directory, so a bug elsewhere that only checks "does this path
 *     exist" (rather than "does it belong to this applicant") is still
 *     contained to one directory rather than the whole store.
 */
export class LocalFileStorage {
  constructor({
    root,
    tempDir,
    tempDirName = "tmp",
    applicantsDirName = "applicants",
  } = {}) {
    if (!root) {
      throw new Error("LocalFileStorage requires a root directory");
    }
    this.root = path.resolve(root);
    // Prefer an explicit tempDir (e.g. env.STORAGE_TEMP_DIR) so it can be
    // pinned to exactly the path multer's diskStorage writes to — keeping
    // temp files and the applicants dir on the same filesystem/mount so
    // commit()'s rename() stays atomic instead of falling back to copy+unlink.
    this.tempDir = tempDir
      ? path.resolve(tempDir)
      : path.join(this.root, tempDirName);
    this.applicantsDir = path.join(this.root, applicantsDirName);
  }

  async ensureReady() {
    await fsp.mkdir(this.root, { recursive: true, mode: 0o750 });
    await fsp.mkdir(this.tempDir, { recursive: true, mode: 0o750 });
    await fsp.mkdir(this.applicantsDir, { recursive: true, mode: 0o750 });

    // Fail fast at boot if the mount isn't actually writable (disk full,
    // wrong permissions, read-only mount) rather than discovering it on
    // the first applicant's upload.
    const probe = path.join(this.tempDir, `.write-check-${process.pid}`);
    await fsp.writeFile(probe, "ok");
    await fsp.unlink(probe);
  }

  /** Best-effort startup sweep: removes temp files older than maxAgeMs left behind by a crash/restart mid-upload. Never touches committed applicant files (those live under applicantsDir, not tempDir). */
  async cleanupStaleTempFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
    let entries;
    try {
      entries = await fsp.readdir(this.tempDir);
    } catch {
      return 0;
    }
    const now = Date.now();
    let removed = 0;
    for (const name of entries) {
      if (name.startsWith(".write-check-")) continue;
      const full = path.join(this.tempDir, name);
      try {
        const stat = await fsp.stat(full);
        if (now - stat.mtimeMs > maxAgeMs) {
          await fsp.unlink(full);
          removed += 1;
        }
      } catch {
        // Racing with another process cleaning the same file — ignore.
      }
    }
    return removed;
  }

  /** Allocates a fresh, unguessable temp path for an in-flight upload. Caller (multer diskStorage) streams the request body directly here — nothing passes through Node's memory as a single buffer. */
  allocateTempPath(ext = "") {
    const safeExt = ext && ext.startsWith(".") ? ext : ext ? `.${ext}` : "";
    return path.join(this.tempDir, `${crypto.randomUUID()}${safeExt}`);
  }

  /**
   * Resolves a storage-relative path safely under `root`, refusing to
   * leave it. Accepts only forward-slash relative paths as produced by
   * commit() — never a client-supplied string without this check.
   */
  _resolveStoragePath(relativePath) {
    if (typeof relativePath !== "string" || relativePath.length === 0) {
      throw new Error("Invalid storage path");
    }
    const resolved = path.resolve(this.root, relativePath);
    const rootWithSep = this.root.endsWith(path.sep)
      ? this.root
      : this.root + path.sep;
    if (resolved !== this.root && !resolved.startsWith(rootWithSep)) {
      throw new Error(
        "Refusing to resolve a storage path outside the storage root",
      );
    }
    return resolved;
  }

  /**
   * Moves a validated temp file into its final applicant/type slot.
   * Returns { storedFilename, storagePath, sizeBytes }. `storagePath` is
   * what gets persisted in submission_documents.storage_path — a path
   * relative to `root`, never an absolute filesystem path.
   */
  async commit(tempPath, applicationId, documentType, ext = "") {
    if (!applicationId || typeof applicationId !== "string") {
      throw new Error("commit() requires a valid applicationId");
    }
    if (!documentType || typeof documentType !== "string") {
      throw new Error("commit() requires a valid documentType");
    }
    const safeExt = ext && ext.startsWith(".") ? ext : ext ? `.${ext}` : "";
    const storedFilename = `${documentType}.${crypto.randomUUID()}${safeExt}`;

    // applicationId is already restricted to [A-Z0-9-] by
    // isValidApplicationIdFormat() at the route layer, but defense in
    // depth costs nothing: strip anything that isn't safe for a path
    // segment before it ever touches the filesystem.
    const safeApplicationId = applicationId.replace(/[^a-zA-Z0-9_-]/g, "");
    const applicantDir = path.join(this.applicantsDir, safeApplicationId);
    await fsp.mkdir(applicantDir, { recursive: true, mode: 0o750 });

    const destPath = path.join(applicantDir, storedFilename);

    try {
      await fsp.rename(tempPath, destPath);
    } catch (err) {
      if (err.code === "EXDEV") {
        // Temp dir and applicants dir are on different filesystems —
        // fall back to copy+unlink. Not atomic, but still correct.
        await fsp.copyFile(tempPath, destPath);
        await fsp.unlink(tempPath).catch(() => {});
      } else {
        throw err;
      }
    }

    const stat = await fsp.stat(destPath);
    const storagePath = path
      .relative(this.root, destPath)
      .split(path.sep)
      .join("/");

    return { storedFilename, storagePath, sizeBytes: stat.size };
  }

  /** Streams a committed file. Throws synchronously if storagePath escapes root. */
  createReadStream(storagePath) {
    const resolved = this._resolveStoragePath(storagePath);
    return fs.createReadStream(resolved);
  }

  async exists(storagePath) {
    try {
      const resolved = this._resolveStoragePath(storagePath);
      await fsp.access(resolved, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /** Best-effort delete of a committed file. Never throws on ENOENT — deleting something already gone is a no-op, not a failure. */
  async remove(storagePath) {
    try {
      const resolved = this._resolveStoragePath(storagePath);
      await fsp.unlink(resolved);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  /** Best-effort delete of a temp (not-yet-committed) file. Safe to call on a path that's already gone (e.g. already committed, or the request aborted before multer finished writing). */
  async discardTemp(tempPath) {
    if (!tempPath) return;
    try {
      await fsp.unlink(tempPath);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }
}
