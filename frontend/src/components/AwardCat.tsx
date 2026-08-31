import { motion, useScroll } from "framer-motion";
import Header from "../components/Header";
import bg2 from "../assets/awardcat.jpeg";

const IMAGE_ASSETS = {
  visionary_category: "/assets/visionary_design.webp",
  high_category: "/assets/high_performance.webp",
  advance_category: "/assets/advance.webp",
  legendary_category: "/assets/high_performance.webp", // Update with actual path
};

const EASE = [0.22, 1, 0.36, 1] as const;

// Primary accent blue from the codebase
const ACCENT_BLUE = "#1e3a8a"; // Tailwind blue-900

function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-blue-900 origin-left z-[60]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

/** Simple fade-up animation without layout-affecting transforms */
function RevealUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Optimized category image with lazy loading and WebP support.
 */
function CategoryImage({
  src,
  label,
  meta,
  aspect = "aspect-[4/5]",
  className = "",
}: {
  src: string;
  label: string;
  meta: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 1.03,
      }}
      whileInView={{
        opacity: 1,
        scale: 1,
      }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: EASE }}
      whileHover={{ scale: 1.02 }}
      className={`group relative overflow-hidden ${aspect} ${className}`}
    >
      {/* Real category image with lazy loading */}
      <img
        src={src}
        alt={label}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Subtle gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

      {/* Category label */}
      <div className="absolute top-4 left-4">
        <span className="text-[10px] font-bold uppercase tracking-[2px] text-slate-700 bg-white/85 backdrop-blur px-2.5 py-1">
          {label}
        </span>
      </div>

      {/* Image meta */}
      <div className="absolute bottom-4 left-4">
        <p className="text-[11px] uppercase tracking-[1.5px] text-white/80">
          {meta}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * A single award category — reusable for all four categories.
 */
function AwardCategory({
  number,
  heading,
  description,
  image,
  reverse = false,
}: {
  number: string;
  heading: string;
  description: string;
  image: {
    src: string;
    label: string;
    meta: string;
  };
  reverse?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-start">
      <div className={reverse ? "lg:order-2" : ""}>
        {/* Category number and label */}
        <RevealUp>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-sm font-bold tracking-[3px] text-blue-900">
              {number}
            </span>
            <span className="text-[10px] uppercase tracking-[2px] text-slate-400">
              Award Category
            </span>
          </div>
        </RevealUp>

        {/* Category heading */}
        <RevealUp delay={0.1} className="mb-6">
          <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight leading-[1.02] text-slate-950">
            {heading}
          </h2>
        </RevealUp>

        {/* Description as normal editorial paragraph */}
        <RevealUp delay={0.15} className="mb-8">
          <p className="text-base leading-relaxed text-slate-600 max-w-lg">
            {description}
          </p>
        </RevealUp>

        {/* CTA */}
        <RevealUp delay={0.2}>
          <span className="group inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[2px] text-slate-900 cursor-default">
            Explore category

            <span className="relative h-px w-6 bg-slate-300 overflow-hidden">
              <span
                className="absolute inset-0 bg-blue-900 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                style={{ backgroundColor: ACCENT_BLUE }}
              />
            </span>

            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>
        </RevealUp>
      </div>

      {/* Image column */}
      <div className={reverse ? "lg:order-1" : ""}>
        <CategoryImage
          src={image.src}
          label={image.label}
          meta={image.meta}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const AwardCat = () => {
  return (
    <div className="bg-white text-slate-950">
      <ScrollProgress />

      {/* Subtle fixed chapter indicator, desktop only */}
      <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-4">
        {["01", "02", "03", "04"].map((n) => (
          <span
            key={n}
            className="text-[10px] font-bold tracking-[1px] text-slate-300"
          >
            {n}
          </span>
        ))}
      </div>

      {/* ================================================================ */}
      {/* HERO — Detailsawards style (contained image, no title overlay)   */}
      {/* ================================================================ */}

      <section className="relative w-full overflow-hidden bg-[#171A1C]">
        {/* Background Image */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            src={bg2}
            alt="Award Categories Hero"
            className="absolute inset-0 w-full h-full object-contain object-center"
          />
        </div>

        {/* Spacer - maintains fixed height */}
        <div className="w-full h-[55vh] min-h-[380px] md:min-h-[440px]" />

        {/* Gradient Scrim - from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10 pointer-events-none" />

        {/* Header Scrim - from top */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header />
        </div>
      </section>

      {/* ================================================================ */}
      {/* INTRODUCTION                                                      */}
      {/* ================================================================ */}

      <section className="relative bg-white border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 text-center">
          <RevealUp delay={0.1}>
            <p className="text-xl font-semibold md:text-lg text-slate-600 leading-relaxed">
              The Holcim Structural Excellence Awards feature four principal
              categories, each designed to honor a distinct dimension of
              engineering achievement, innovation, and sustainable
              development across Bangladesh&apos;s built environment.
            </p>
          </RevealUp>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CATEGORY 01 — HIGH PERFORMANCE                                   */}
      {/* ================================================================ */}

      <section className="relative bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <AwardCategory
            number="01"
            heading="High Performance Concrete Structure"
            description="High Performance Concrete (HPC) structures deliver exceptional strength, durability, and structural performance by leveraging optimized mix designs and innovative material solutions. Advanced quality control and execution excellence maximize structural efficiency, safety, and serviceability. These structures offer enhanced protection against severe environmental exposures—such as chloride and sulfate attack—ensuring long-term resilience and extended service life."
            image={{
              src: IMAGE_ASSETS.high_category,
              label: "High Performance Concrete Structure",
              meta: "Structural Detail",
            }}
          />
        </div>
      </section>

      {/* ================================================================ */}
      {/* CATEGORY 02 — ADVANCED CONSTRUCTION                              */}
      {/* ================================================================ */}

      <section className="relative bg-[#1B2A4A] border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-start lg:grid-flow-col-reverse">
            <div className="lg:order-2">
              {/* Category number and label */}
              <RevealUp>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-sm font-bold tracking-[3px] text-slate-300">
                    02
                  </span>
                  <span className="text-[10px] uppercase tracking-[2px] text-slate-300">
                    Award Category
                  </span>
                </div>
              </RevealUp>

              {/* Category heading */}
              <RevealUp delay={0.1} className="mb-6">
                <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight leading-[1.02] text-white">
                  Advanced Construction Technology & Circularity
                </h2>
              </RevealUp>

              {/* Description */}
              <RevealUp delay={0.15} className="mb-8">
                <p className="text-base leading-relaxed text-slate-300 max-w-lg">
                 Celebrating groundbreaking methods, modern technologies, and sustainable processes in structural engineering, this category highlights the future of built solutions. It honors projects that prioritize the efficient application of low-carbon materials, waste minimization, and circular resource utilization. Recognized entries demonstrate resource-efficient construction practices that deliver clear, measurable environmental benefits.
                </p>
              </RevealUp>

              {/* CTA */}
              <RevealUp delay={0.2}>
                <span className="group inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[2px] text-slate-300 cursor-default">
                  Explore category

                  <span className="relative h-px w-6 bg-slate-300 overflow-hidden">
                    <span
                      className="absolute inset-0 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                      style={{ backgroundColor: "whitesmoke" }}
                    />
                  </span>

                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </RevealUp>
            </div>

            {/* Image column */}
            <div className="lg:order-1">
              <CategoryImage
                src={IMAGE_ASSETS.advance_category}
                label="Advanced Construction Technology & Circularity"
                meta="Process / Technology"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CATEGORY 03 — VISIONARY DESIGN                                   */}
      {/* ================================================================ */}

      <section className="relative bg-white border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <AwardCategory
            number="03"
            heading={`Next Generation\nVisionary Design`}
            description="Dedicated to innovative, resilient, and future-ready structural design approaches, this award honors creative solutions that solve complex engineering challenges. It evaluates projects integrating emerging technologies and advanced engineering practices that drive meaningful impact across structural safety, material efficiency, sustainability, and real-world constructability."
            image={{
              src: IMAGE_ASSETS.visionary_category,
              label: "Visionary Design",
              meta: "Visionary Structure",
            }}
          />
        </div>
      </section>

      {/* ================================================================ */}
      {/* CATEGORY 04 — LEGENDARY STRUCTURAL ENGINEER                      */}
      {/* ================================================================ */}

      <section className="relative bg-[#1B2A4A]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-start">
            <div>
              {/* Category number and label */}
              <RevealUp>
                <div className="flex items-baseline gap-2 mb-6">
                  <span
                    className="text-sm font-bold tracking-[3px]"
                    style={{ color: "white" }}
                  >
                    04
                  </span>
                  <span className="text-[10px] uppercase tracking-[2px] text-slate-300">
                    Honorary Award
                  </span>
                </div>
              </RevealUp>

              {/* Category heading */}
              <RevealUp delay={0.1} className="mb-6">
                <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight leading-[1.02] text-white">
                  Legendary Structural Engineer Award
                </h2>
              </RevealUp>

              {/* Subtitle */}
              <RevealUp delay={0.15} className="mb-8">
                <p className="text-base font-semibold text-slate-300">
                  Lifetime Achievement Award
                </p>
              </RevealUp>

              {/* Description */}
              <RevealUp delay={0.2} className="mb-8">
                <p className="text-base leading-relaxed text-white max-w-lg">
                  This honorary accolade celebrates extraordinary lifetime leadership, pioneering achievements, and enduring contributions to the field of structural engineering. The award recognizes an individual whose work in structural design, innovation, research, education, or professional practice has left a lasting legacy on the engineering profession and the built environment.
                </p>
              </RevealUp>

              {/* Jury nomination */}
              <RevealUp delay={0.3}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-slate-300 mb-3">
                    Selection Process
                  </p>
                  <p className="text-sm text-white leading-relaxed max-w-lg">
                    This category does not require direct submissions; the recipient is selected directly by the Jury through a dedicated nomination and evaluation process.
                  </p>
                </div>
              </RevealUp>

              {/* CTA */}
              <RevealUp delay={0.35} className="mt-8">
                <span className="group inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[2px] text-slate-300 cursor-default">
                  Explore category

                  <span className="relative h-px w-6 bg-slate-300 overflow-hidden">
                    <span
                      className="absolute inset-0 bg-blue-900 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                      style={{ backgroundColor: ACCENT_BLUE }}
                    />
                  </span>

                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </RevealUp>
            </div>

            {/* Image column */}
            <div>
              <CategoryImage
                src={IMAGE_ASSETS.legendary_category}
                label="Legendary Structural Engineer"
                meta="Lifetime Achievement"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AwardCat;