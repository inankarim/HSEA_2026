import { AnimatePresence, motion } from "framer-motion";

export type SaveState = "idle" | "saving" | "saved" | "error" | "offline";

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
  const config: Record<SaveState, { label: string; dot: string; text: string }> = {
    idle: { label: "No changes yet", dot: "bg-gray-300", text: "text-gray-400" },
    saving: { label: "Saving…", dot: "bg-accent-cyan animate-pulse", text: "text-navy-deep/70" },
    saved: {
      label: lastSavedAt ? `Saved · ${relativeTime(lastSavedAt)}` : "Saved",
      dot: "bg-emerald-500",
      text: "text-navy-deep/70",
    },
    error: { label: "Unable to save — retrying", dot: "bg-red-500", text: "text-red-600" },
    offline: { label: "Connection lost — changes kept locally", dot: "bg-amber-500", text: "text-amber-600" },
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}