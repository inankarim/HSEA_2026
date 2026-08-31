import crypto from "node:crypto";

// Unambiguous alphabet: no 0/O, 1/I to avoid transcription errors when
// applicants read the ID aloud or copy it into their Drive folder name.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const SUFFIX_LENGTH = 6;
const PREFIX = "HSEA26-";

function randomSuffix() {
  const bytes = crypto.randomBytes(SUFFIX_LENGTH);
  let out = "";
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Generates a candidate Application ID. The caller (submission.service.js)
 * is responsible for checking uniqueness against PostgreSQL and retrying
 * on the rare collision — this function never touches the database so it
 * stays safe to call from any stateless instance.
 */
export function generateApplicationId() {
  return `${PREFIX}${randomSuffix()}`;
}

const APPLICATION_ID_PATTERN = /^HSEA26-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;

export function isValidApplicationIdFormat(id) {
  return typeof id === "string" && APPLICATION_ID_PATTERN.test(id);
}
