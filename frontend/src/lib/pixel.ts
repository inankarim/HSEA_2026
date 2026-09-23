// Thin wrapper around the Meta Pixel's global fbq() (loaded in index.html).
// Guards against ad blockers / consent tools that strip window.fbq so
// tracking calls never throw and break the actual user flow.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackPixelEvent(eventName: string, isCustom = false) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(isCustom ? "trackCustom" : "track", eventName);
}
