import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Rotating announcement ticker banner, sits directly under the hero.
 * Messages slide in from the left and exit to the right — continuous,
 * premium ticker motion rather than a static centered message. Dark
 * semi-transparent scrim keeps text legible over any background image;
 * accent-cyan picks out key info (dates, counts, CTAs).
 */

const EASE = [0.22, 1, 0.36, 1] as const;
const CYCLE_MS = 4500;

// Set your actual submission deadline here — the countdown message
// recalculates automatically on every render, so it never goes stale.
const SUBMISSION_DEADLINE = new Date("2026-10-31T23:59:59");

type Announcement = {
  text: string;
  highlight?: string; // optional substring to render in accent color
};

function getDaysRemaining(): number {
  const now = new Date();
  const diffMs = SUBMISSION_DEADLINE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function useAnnouncements(): Announcement[] {
  return useMemo(() => {
    const daysLeft = getDaysRemaining();
    return [
      { 
        text: "Holcim Structural Excellence Awards 2026 — Submissions Open",
        highlight: "Submissions Open",
      },
      {

        text: "Submission Deadline: October 31, 2026",
        highlight: "October 31, 2026",
      },
      {
        text:
          daysLeft > 0
            ? `Only ${daysLeft} Day${daysLeft === 1 ? "" : "s"} Remaining to Submit Your Project`
            : "Submission Window Has Closed",
        highlight: daysLeft > 0 ? `${daysLeft} Day${daysLeft === 1 ? "" : "s"}` : undefined,
      },
      {
        text: "Celebrating Excellence in Sustainability, Innovation & Structural Performance",
        highlight: "Sustainability, Innovation & Structural Performance",
      },
      {
        text: "Meet the Jury and Explore Award Categories",
        highlight: "Meet the Jury",
      },
    ];
  }, []);
}

/** Renders text with an optional highlighted substring in accent color. */
function AnnouncementText({ announcement }: { announcement: Announcement }) {
  if (!announcement.highlight) {
    return <>{announcement.text}</>;
  }

  const idx = announcement.text.indexOf(announcement.highlight);
  if (idx === -1) return <>{announcement.text}</>;

  const before = announcement.text.slice(0, idx);
  const match = announcement.text.slice(idx, idx + announcement.highlight.length);
  const after = announcement.text.slice(idx + announcement.highlight.length);

  return (
    <>
      {before}
      <span className="text-accent-cyan font-extrabold">{match}</span>
      {after}
    </>
  );
}

export default function AnnouncementTicker() {
  const announcements = useAnnouncements();
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [isPaused, announcements.length]);

  const active = announcements[index];

  return (
    <div
      className="relative z-30 w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Dark scrim so text stays legible over any hero background */}
      <div className="bg-[#1B2A4A] backdrop-blur-sm border-y border-white/10">
<div className="mx-auto max-w-7xl px-6 py-2.5 sm:py-3">
  <div className="flex items-center gap-3 sm:gap-4 min-h-[24px] sm:min-h-[28px]">
    {/* Ticker viewport — clips the slide-across motion */}
    <div className="relative flex-1 h-6 sm:h-7 overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.p
          key={index}
          initial={{ x: "-40%", opacity: 0 }}
          animate={{ x: "0%", opacity: 1 }}
          exit={{ x: "40%", opacity: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
          className="absolute inset-0 flex items-center justify-center sm:justify-start text-center sm:text-left text-xs sm:text-sm lg:text-[15px] font-semibold tracking-wide text-white whitespace-nowrap overflow-hidden text-ellipsis"
        >
          <span className="overflow-hidden text-ellipsis">
            <AnnouncementText announcement={active} />
          </span>
        </motion.p>
      </AnimatePresence>
    </div>

    {/* Progress dots */}
    <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
      {announcements.map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Show announcement ${i + 1}`}
          onClick={() => setIndex(i)}
          className={[
            "h-1.5 rounded-full transition-all duration-300",
            i === index ? "w-5 bg-accent-cyan" : "w-1.5 bg-white/30 hover:bg-white/50",
          ].join(" ")}
        />
      ))}
    </div>
  </div>
</div>
      </div>
    </div>
  );
}