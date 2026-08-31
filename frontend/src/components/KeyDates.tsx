import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import FadeIn from "./FadeIn";
import bgImage from "../assets/bg2.png";

const DEADLINE = new Date("2026-10-31T23:59:00+06:00").getTime();

function getTimeLeft() {
  const diff = Math.max(0, DEADLINE - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function KeyDates() {
  const navigate = useNavigate();
  const [time, setTime] = useState(getTimeLeft());

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const units: { label: string; value: number }[] = [
    { label: "Days", value: time.days },
    { label: "Hrs", value: time.hours },
    { label: "Min", value: time.minutes },
    { label: "Sec", value: time.seconds },
  ];

  return (
    <section
      id="key-dates"
      className="relative bg-navy-deep bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Overlay to keep text legible over the background image */}
      <div className="absolute inset-0 bg-navy-deep/80" />

      <div className="relative mx-auto max-w-7xl px-6 py-6 sm:py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 xl:gap-20">
        {/* Left: key dates */}
        <FadeIn y={16}>
          <span className="text-xs font-bold uppercase tracking-[3px] text-accent-cyan">
            Key Dates
          </span>

          <p className="mt-6 text-xs font-bold uppercase tracking-wide text-white/60">
            Submission Open
          </p>
          <h3 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Deadline
          </h3>
          <div className="mt-4 inline-block rounded-lg bg-white px-6 sm:px-8 py-3 sm:py-4">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-navy-deep">
              31 October 2026
            </span>
          </div>
          <p className="mt-3 text-sm text-white/60">
            11:59 PM (BD Time) · 31 October
          </p>
        </FadeIn>

        {/* Right: countdown */}
        <FadeIn y={16} delay={0.15}>
          <p className="text-xs font-bold uppercase tracking-wide text-white/60">
           Deadline Closes In
          </p>
          <div className="mt-6 lg:mt-8 grid grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {units.map((u) => (
              <div
                key={u.label}
                className="rounded-lg border border-white/15 bg-white/5 py-4 sm:py-5 lg:py-6 px-2 sm:px-3 lg:px-4 text-center overflow-hidden"
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={u.value}
                    initial={{ y: -14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 14, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white"
                  >
                    {pad(u.value)}
                  </motion.div>
                </AnimatePresence>
                <div className="mt-2 text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-wide text-white/50">
                  {u.label}
                </div>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/submit")}
            className="mt-6 lg:mt-8 w-full rounded-lg border border-accent-cyan bg-accent-cyan/10 py-3 sm:py-4 lg:py-4 text-sm lg:text-base font-bold uppercase tracking-wide text-accent-cyan hover:bg-accent-cyan hover:text-navy-deep transition-colors"
          >
            Submit Project
          </motion.button>
        </FadeIn>
      </div>
    </section>
  );
}