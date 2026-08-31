import test from "node:test";
import assert from "node:assert/strict";
import { isValidGoogleDriveFolderUrl } from "../src/utils/googleDrive.js";

test("accepts a standard Drive folder URL", () => {
  assert.equal(
    isValidGoogleDriveFolderUrl(
      "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrSt"
    ),
    true
  );
});

test("accepts a Drive folder URL with query params", () => {
  assert.equal(
    isValidGoogleDriveFolderUrl(
      "https://drive.google.com/drive/folders/1AbCdEfGh?usp=sharing"
    ),
    true
  );
});

test("rejects non-Drive URLs", () => {
  assert.equal(isValidGoogleDriveFolderUrl("https://dropbox.com/s/xyz"), false);
  assert.equal(isValidGoogleDriveFolderUrl("not a url"), false);
  assert.equal(isValidGoogleDriveFolderUrl(""), false);
  assert.equal(isValidGoogleDriveFolderUrl(null), false);
});

test("rejects a Drive URL that is not a folder link", () => {
  assert.equal(
    isValidGoogleDriveFolderUrl("https://drive.google.com/file/d/1AbCdEfGh/view"),
    false
  );
});
