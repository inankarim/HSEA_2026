import { motion } from "framer-motion";
import dashbg4 from "../assets/dashbg4.png";

/**
 * Full-bleed photographic hero for the Dashboard page, matching the
 * Holcim Foundation reference: dark background image with a gradient scrim.
 */
export default function DashboardHero() {
  return (
    <section className="relative w-full overflow-hidden bg-[#171A1C]">
      <motion.img
        src={dashbg4}
        alt="Honoring Engineers — Building A Sustainable Bangladesh"
        className="absolute inset-0 w-full h-full object-contain object-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />

      {/* Spacer that reserves the correct height based on image aspect ratio */}
      <div className="w-full aspect-[4/1] sm:aspect-[3.5/1] lg:aspect-[4/1]" />

      {/* Scrim so any future overlay content stays legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/50 via-navy-deep/20 to-transparent pointer-events-none" />
    </section>
  );
}