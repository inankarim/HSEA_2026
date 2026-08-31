import test from "node:test";
import assert from "node:assert/strict";
import {
  generateApplicationId,
  isValidApplicationIdFormat,
} from "../src/utils/applicationId.js";

test("generateApplicationId produces the expected format", () => {
  const id = generateApplicationId();
  assert.match(id, /^HSEA26-[A-Z0-9]{6}$/);
  assert.equal(isValidApplicationIdFormat(id), true);
});

test("generateApplicationId does not produce ambiguous characters", () => {
  for (let i = 0; i < 200; i++) {
    const id = generateApplicationId();
    assert.doesNotMatch(id.slice(7), /[0O1I]/);
  }
});

test("isValidApplicationIdFormat rejects malformed ids", () => {
  assert.equal(isValidApplicationIdFormat("HSEA26-ABC"), false);
  assert.equal(isValidApplicationIdFormat("hsea26-abcdef"), false);
  assert.equal(isValidApplicationIdFormat("HSEA26-ABCDEF0"), false);
  assert.equal(isValidApplicationIdFormat(""), false);
  assert.equal(isValidApplicationIdFormat(null), false);
});
