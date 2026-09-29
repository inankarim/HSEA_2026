const CONSENT_KEY = "hsea:cookieConsent";

export type ConsentValue = "accepted" | "declined";

export function getConsent(): ConsentValue | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Private browsing / storage blocked — the banner will just reappear
    // next visit, which is an acceptable fallback rather than throwing.
  }
}
