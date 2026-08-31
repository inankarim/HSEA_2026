import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { LocalFileStorage } from "../src/storage/LocalFileStorage.js";
import {
  isValidDocumentType,
  allowedMimeTypesFor,
  requiredDocumentTypes,
  conditionallyRequiredDocumentTypes,
  DOCUMENT_TYPE_KEYS,
} from "../src/config/documentTypes.js";

async function makeTempStorage() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hsea-storage-test-"));
  const storage = new LocalFileStorage({ root });
  await storage.ensureReady();
  return storage;
}

describe("documentTypes registry", () => {
  test("every document type has a kind and label", () => {
    for (const key of DOCUMENT_TYPE_KEYS) {
      assert.ok(isValidDocumentType(key));
    }
  });

  test("rejects unknown document types", () => {
    assert.equal(isValidDocumentType("NOT_A_REAL_TYPE"), false);
    assert.equal(isValidDocumentType(""), false);
    assert.equal(isValidDocumentType(undefined), false);
  });

  test("allowedMimeTypesFor returns PDF types for pdf-kind documents", () => {
    const mimes = allowedMimeTypesFor("APPLICANT_NID");
    assert.ok(mimes.includes("application/pdf"));
    assert.equal(mimes.includes("image/jpeg"), false);
  });

  test("allowedMimeTypesFor returns image types for image-kind documents", () => {
    const mimes = allowedMimeTypesFor("APPLICANT_PHOTO");
    assert.ok(mimes.includes("image/jpeg"));
    assert.ok(mimes.includes("image/png"));
    assert.equal(mimes.includes("application/pdf"), false);
  });

  test("EXECUTIVE_SUMMARY accepts both PDF and image", () => {
    const mimes = allowedMimeTypesFor("EXECUTIVE_SUMMARY");
    assert.ok(mimes.includes("application/pdf"));
    assert.ok(mimes.includes("image/jpeg"));
  });

  test("COSTING and PROJECT_DESCRIPTION are conditionally required, not unconditionally", () => {
    const required = requiredDocumentTypes();
    const conditional = conditionallyRequiredDocumentTypes();
    assert.equal(required.includes("COSTING"), false);
    assert.equal(required.includes("PROJECT_DESCRIPTION"), false);
    assert.ok(conditional.includes("COSTING"));
    assert.ok(conditional.includes("PROJECT_DESCRIPTION"));
  });

  test("NID/photos/drawings are unconditionally required", () => {
    const required = requiredDocumentTypes();
    for (const key of [
      "APPLICANT_NID",
      "APPLICANT_PHOTO",
      "ENGINEER_PHOTO",
      "OWNER_AUTHORIZATION",
      "DESIGN_DEMONSTRATION",
      "SUSTAINABILITY_METRICS",
      "EXECUTIVE_SUMMARY",
      "ARCHITECTURAL_DRAWINGS",
    ]) {
      assert.ok(required.includes(key), `${key} should be required`);
    }
  });
});

describe("LocalFileStorage", () => {
  test("commit() moves a temp file into the applicant folder and returns metadata", async () => {
    const storage = await makeTempStorage();
    const tempPath = storage.allocateTempPath(".pdf");
    await fs.writeFile(tempPath, "%PDF-1.4 fake content %%EOF");

    const result = await storage.commit(
      tempPath,
      "HSEA26-ABCDEF",
      "APPLICANT_NID",
      ".pdf",
    );

    assert.match(result.storedFilename, /^APPLICANT_NID\..+\.pdf$/);
    assert.ok(result.sizeBytes > 0);

    // Temp file should be gone (renamed, not copied).
    await assert.rejects(() => fs.access(tempPath));

    // Committed file should be readable via the driver.
    const stream = storage.createReadStream(result.storagePath);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.match(Buffer.concat(chunks).toString(), /%PDF-1.4/);
  });

  test("re-upload (commit again for same slot) does not clobber other applicants", async () => {
    const storage = await makeTempStorage();

    const t1 = storage.allocateTempPath(".pdf");
    await fs.writeFile(t1, "applicant one file");
    const r1 = await storage.commit(
      t1,
      "HSEA26-AAAAAA",
      "APPLICANT_NID",
      ".pdf",
    );

    const t2 = storage.allocateTempPath(".pdf");
    await fs.writeFile(t2, "applicant two file");
    const r2 = await storage.commit(
      t2,
      "HSEA26-BBBBBB",
      "APPLICANT_NID",
      ".pdf",
    );

    assert.notEqual(r1.storagePath, r2.storagePath);

    const s1 = await fs.readFile(
      path.join(storage.root, r1.storagePath),
      "utf8",
    );
    const s2 = await fs.readFile(
      path.join(storage.root, r2.storagePath),
      "utf8",
    );
    assert.equal(s1, "applicant one file");
    assert.equal(s2, "applicant two file");
  });

  test("remove() deletes a committed file and is a no-op if already gone", async () => {
    const storage = await makeTempStorage();
    const tempPath = storage.allocateTempPath(".pdf");
    await fs.writeFile(tempPath, "content");
    const result = await storage.commit(
      tempPath,
      "HSEA26-CCCCCC",
      "COSTING",
      ".pdf",
    );

    await storage.remove(result.storagePath);
    await assert.rejects(() =>
      fs.access(path.join(storage.root, result.storagePath)),
    );

    // Removing again must not throw (best-effort delete).
    await storage.remove(result.storagePath);
  });

  test("_resolveStoragePath refuses to escape the storage root", async () => {
    const storage = await makeTempStorage();
    assert.throws(() => storage._resolveStoragePath("../../etc/passwd"));
  });

  test("discardTemp() is a no-op for a non-existent path", async () => {
    const storage = await makeTempStorage();
    await storage.discardTemp(
      path.join(storage.tempDir, "does-not-exist.part"),
    );
    // no throw = pass
  });
});
