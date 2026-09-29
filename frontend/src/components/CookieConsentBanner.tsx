import { useEffect, useState } from "react";
import { getConsent, setConsent } from "../lib/consent";
import { loadGoogleAnalytics, loadMetaPixel } from "../lib/analyticsLoader";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => getConsent() === null);

  useEffect(() => {
    if (getConsent() === "accepted") {
      loadGoogleAnalytics();
      loadMetaPixel();
    }
  }, []);

  function accept() {
    setConsent("accepted");
    loadGoogleAnalytics();
    loadMetaPixel();
    setVisible(false);
  }

  function decline() {
    setConsent("declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-navy-deep px-6 py-5 shadow-[0_-4px_20px_rgba(0,0,0,0.25)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-white/80">
          We use cookies for essential site functionality and to understand how
          visitors use this site. You can accept
          or decline non-essential cookies at any time.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={decline}
            className="rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-md bg-accent-cyan px-4 py-2 text-sm font-semibold text-navy-deep transition hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
