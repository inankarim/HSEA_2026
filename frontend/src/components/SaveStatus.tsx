import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

export type SaveState = "idle" | "saving" | "saved" | "error" | "offline" | "expired";

function relativeTime(date: Date | null) {
  if (!date) return "";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export default function SaveStatus({
  state,
  lastSavedAt,
}: {
  state: SaveState;
  lastSavedAt: Date | null;
}) {
  const location = useLocation();
  const config: Record<SaveState, { label: string; dot: string; text: string }> = {
    idle: { label: "No changes yet", dot: "bg-gray-300", text: "text-gray-400" },
    saving: { label: "Saving…", dot: "bg-accent-cyan animate-pulse", text: "text-navy-deep/70" },
    saved: {
      label: lastSavedAt ? `Saved · ${relativeTime(lastSavedAt)}` : "Saved",
      dot: "bg-emerald-500",
      text: "text-navy-deep/70",
    },
    error: { label: "Not saved — retrying", dot: "bg-red-600", text: "rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700" },
    offline: { label: "Offline — not saved yet", dot: "bg-amber-500", text: "rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800" },
    expired: { label: "Session expired — not saving.", dot: "bg-red-600", text: "rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700" },
  };

  const c = config[state];

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-2 ${c.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
          {c.label}
          {state === "expired" && (
            <Link to="/login" state={{ from: location.pathname }} className="font-bold underline">
              Sign in again
            </Link>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
/**
 * Prominent, sticky warning shown while the draft can't be saved, so the
 * applicant can't miss it the way they can miss the small status text.
 */
export function SaveProblemBanner({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const location = useLocation();
  if (state !== "error" && state !== "offline" && state !== "expired") return null;

  const content =
    state === "expired"
      ? {
          title: "Your session has expired — your changes are not being saved.",
          body: "Please sign in again to keep working on your submission.",
        }
      : state === "offline"
        ? {
            title: "You're offline — your latest changes are not saved yet.",
            body: "Check your internet connection. We'll keep trying; if this doesn't go away, reload the page.",
          }
        : {
            title: "We couldn't save your latest changes.",
            body: "We'll keep trying automatically. If this message doesn't go away, please reload the page.",
          };

  return (
    <div role="alert" className="sticky top-0 z-40 border-b-2 border-red-300 bg-red-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
            !
          </span>
          <div>
            <p className="text-sm font-bold text-red-800 sm:text-base">{content.title}</p>
            <p className="mt-0.5 text-sm text-red-700">{content.body}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {state === "expired" ? (
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Sign in again
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Reload page
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
