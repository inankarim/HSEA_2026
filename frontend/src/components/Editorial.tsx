import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Header from "./Header";
import bg2 from "../assets/bg.jpg";

/**
 * Shared editorial components for the HSEA 2026 information pages
 * (General Information, Privileges for Winners). Kept visually
 * consistent with the "About the Award" page: white / pale-blue
 * backgrounds, #171A1C text, #66727A muted text, #C86F3D accent used
 * only for numbers, tiny labels, and lines — never as a fill color.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

export function InfoHero({
  title,
  titleClassName = "text-[#171A1C]",
}: {
  title: string;
  titleClassName?: string;
}) {
  return (
    <section className="relative h-[55vh] min-h-[380px] md:min-h-[440px] overflow-hidden border-b border-[#171A1C]/10">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-[#D6D6D6] bg-cover bg-center"
        style={{ backgroundImage: `url(${bg2})` }}
      />

      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />

      <div className="relative z-20">
        <Header />
      </div>

      <div className="relative z-10 h-[calc(100%-6rem)] flex items-center px-6 md:px-16">
       <motion.h1
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className={`text-3xl sm:text-4xl md:text-6xl font-bold uppercase ${titleClassName}`}
          style={{ color: titleClassName === "text-white" ? "#ffffff" : undefined }}
        >
          {title}
</motion.h1>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Typography                                                         */
/* ------------------------------------------------------------------ */

/** Masked line-reveal heading, used for the large editorial statements. */
export function AnimatedHeading({
  text,
  as: Tag = "h2",
  className = "",
  delay = 0,
}: {
  text: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  delay?: number;
}) {
  return (
    <div className="overflow-hidden">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, delay, ease: EASE }}
      >
        <Tag className={className}>{text}</Tag>
      </motion.div>
    </div>
  );
}

/** Thin horizontal separator used between rules and chapters. */
export function SectionDivider({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-[#171A1C]/10 ${className}`} />;
}

/** Small accent highlight for a prominent term (e.g. "6 MONTHS"). */
export function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="text-[#C86F3D] font-bold">{children}</span>
  );
}

/**
 * A visibly-flagged placeholder for clauses whose exact legal wording
 * wasn't supplied yet. Deliberately styled differently from real rule
 * text (dashed left rule, muted italic) so it's obvious at a glance
 * which items still need the Secretariat's official wording pasted in.
 */
export function PendingNote() {
  return (
    <p className="border-l-2 border-dashed border-[#171A1C]/20 pl-4 text-sm italic text-[#66727A]/70">
      Official wording pending.
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Chapters & rules                                                   */
/* ------------------------------------------------------------------ */

/**
 * The editorial introduction block that follows the hero — a large
 * number + label, a short pull-quote-style statement, and one
 * supporting paragraph. Used once per page.
 */
export function ChapterIntro({
  number,
  label,
  statement,
  paragraph,
}: {
  number: string;
  label: string;
  statement: string;
  paragraph: string;
}) {
  return (
    <section className="relative border-t border-[#171A1C]/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10 md:gap-16">
        <div className="flex md:flex-col items-baseline md:items-start gap-3 md:gap-4">
          <span className="text-5xl md:text-6xl font-light text-[#C86F3D]/80 tabular-nums">
            {number}
          </span>
          <span className="text-xs font-bold uppercase tracking-[3px] text-[#66727A]">
            {label}
          </span>
        </div>

        <div>
          <AnimatedHeading
            text={statement}
            className="text-2xl md:text-4xl font-bold leading-tight max-w-3xl text-[#171A1C]"
          />
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 max-w-2xl text-[#66727A] leading-relaxed"
          >
            {paragraph}
          </motion.p>
        </div>
      </div>
    </section>
  );
}

/**
 * A titled group of RuleItems — e.g. "01 — Submission & Eligibility".
 * Alternates background so long documents stay visually segmented
 * without resorting to cards.
 */
export function ChapterGroup({
  number,
  total,
  label,
  tinted = false,
  children,
}: {
  number: string;
  total: string;
  label: string;
  tinted?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`relative ${tinted ? "bg-[#EEF4F7]" : ""}`}>
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="flex items-baseline gap-4">
          <span className="text-xs font-bold uppercase tracking-[3px] text-[#66727A]">
            {number} / {total}
          </span>
        </div>
        <h3 className="mt-3 text-2xl md:text-3xl font-bold uppercase tracking-wide text-[#171A1C]">
          {label}
        </h3>

        <div className="mt-14 space-y-14">{children}</div>
      </div>
    </section>
  );
}

/**
 * A single editorial rule: number / category label / title / body.
 * Desktop uses a three-column grid (number — title — description);
 * mobile stacks in reading order.
 */
export function RuleItem({
  number,
  category,
  title,
  children,
  index = 0,
}: {
  number: string;
  category: string;
  title: string;
  children: ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.08, 0.4), ease: EASE }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4 md:gap-10">
        <span className="text-3xl font-light text-[#C86F3D]/70 tabular-nums">
          {number}
        </span>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#66727A]">
            {category}
          </span>
          <h4 className="mt-2 text-lg md:text-xl font-bold uppercase tracking-wide text-[#171A1C]">
            {title}
          </h4>
          <div className="mt-3 max-w-2xl space-y-3 text-[#66727A] leading-relaxed">
            {children}
          </div>
        </div>
      </div>
      <SectionDivider className="mt-10" />
    </motion.div>
  );
}

/** Oversized, near-invisible background word for the winners page. */
export function GhostWord({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none select-none absolute inset-0 flex items-center justify-center text-[22vw] font-bold uppercase text-[#171A1C]/[0.03] leading-none"
    >
      {children}
    </span>
  );
}