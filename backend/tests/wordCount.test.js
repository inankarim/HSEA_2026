import test from "node:test";
import assert from "node:assert/strict";
import { countWords, withinWordLimit } from "../src/utils/wordCount.js";

test("countWords handles empty/whitespace input", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("   "), 0);
  assert.equal(countWords(undefined), 0);
});

test("countWords counts simple text correctly", () => {
  assert.equal(countWords("one two three"), 3);
  assert.equal(countWords("  one   two  three  "), 3);
});

test("withinWordLimit enforces the 500-word cap", () => {
  const longText = new Array(501).fill("word").join(" ");
  const okText = new Array(500).fill("word").join(" ");
  assert.equal(withinWordLimit(longText, 500), false);
  assert.equal(withinWordLimit(okText, 500), true);
});
