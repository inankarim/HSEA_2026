// Thin wrapper around GA4's global gtag() (loaded by analyticsLoader.ts only
// after cookie consent). No-op when gtag is missing (consent declined, ad
// blocker), so tracking never breaks the user flow. Never pass personal
// data (names, emails, phone numbers) in params.
export function trackGaEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}

export function trackGaPageView() {
  trackGaEvent("page_view", {
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search,
    page_title: document.title,
  });
}
