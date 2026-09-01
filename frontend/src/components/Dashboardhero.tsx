import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dashbg4 from "../assets/dashbg43.png";
import dashbg1 from "../assets/01-NG_T9-Banners1400-x-350-.png";
import dashbg2 from "../assets/02-NG_T9-Banners1400-x-350-.png";
import dashbg3 from "../assets/Flag.png";

const slides = [
  { src: dashbg4, alt: "Honoring Engineers — Building A Sustainable Bangladesh" },
  { src: dashbg1, alt: "HSEA 2026 Banner 1" },
  { src: dashbg2, alt: "HSEA 2026 Banner 2" },
  { src: dashbg3, alt: "HSEA 2026 Banner 3" },
];

const SLIDE_DURATION = 4000; // ms each slide stays before advancing

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

/**
 * Full-bleed photographic hero for the Dashboard page, matching the
 * Holcim Foundation reference: dark background image with a gradient scrim.
 * Auto-advancing slider, one direction (left/right slide), no manual controls.
 */
export default function DashboardHero() {
  const [[index, direction], setIndex] = useState<[number, number]>([0, 1]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(([prev]) => [(prev + 1) % slides.length, 1]);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-[#171A1C]">
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img
            key={index}
            src={slides[index].src}
            alt={slides[index].alt}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-contain object-center"
          />
        </AnimatePresence>
      </div>

      {/* Spacer that reserves the correct height based on image aspect ratio */}
      <div className="w-full aspect-[4/1] sm:aspect-[3.5/1] lg:aspect-[4/1]" />

      {/* Scrim so any future overlay content stays legible */}
      {/* <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/50 via-navy-deep/20 to-transparent pointer-events-none" /> */}
    </section>
  );
}