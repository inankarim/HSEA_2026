// Thin wrapper around the Meta Pixel's global fbq() (loaded by
// analyticsLoader.ts only after cookie consent).
// Guards against ad blockers / consent tools that strip window.fbq so
// tracking calls never throw and break the actual user flow.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackPixelEvent(
  eventName: string,
  isCustom = false,
  params?: Record<string, unknown>
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (params) window.fbq(isCustom ? "trackCustom" : "track", eventName, params);
  else window.fbq(isCustom ? "trackCustom" : "track", eventName);
}
