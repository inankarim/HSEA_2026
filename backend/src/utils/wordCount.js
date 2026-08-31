/**
 * Reusable word-count utility. The frontend's word counter must never be
 * trusted — this is the single source of truth enforced server-side.
 */
export function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function withinWordLimit(text, maxWords) {
  return countWords(text) <= maxWords;
}
