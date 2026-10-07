import { motion, useReducedMotion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import trophyImg from "../assets/Toffee-02-.png";
import highPerfBadge from "../assets/high-gen.png";
import advancedBadge from "../assets/advance_gen.png";
import nextGenBadge from "../assets/nextgen.png";
import legendaryImg from "../assets/Toffee.png";

const EASE = [0.22, 1, 0.36, 1] as const;

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
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Winner hierarchy — artwork cropped directly from the reference      */
/*  design, so the trophy/laurel/crown emblems match it exactly rather  */
/*  than being redrawn as approximate vector icons.                     */
/* ------------------------------------------------------------------ */

function CategoryBadge({
  src,
  alt,
  delay = 0,
}: {
  src: string;
  alt: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : delay, ease: EASE }}
      className="flex items-center justify-center"
    >
      <img src={src} alt={alt} className="h-auto w-[110px] sm:w-[160px] md:w-[190px]" />
    </motion.div>
  );
}

function WinnerHierarchy() {
  const reduce = useReducedMotion();
  const lineTransition = { duration: reduce ? 0 : 1.1, ease: EASE };

  return (
    <section className="relative overflow-hidden bg-white py-14 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <RevealUp className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-[3px] text-brand-cyan">
            The Hierarchy
          </span>
          <h2 className="mt-3 text-2xl font-bold uppercase tracking-tight text-navy-deep sm:text-3xl md:text-4xl">
            Award Winner Structure
          </h2>
        </RevealUp>

        {/* Grand Winner */}
        <div className="mt-6 mb-3 flex flex-col items-center sm:mb-2 md:mt-10 md:mb-0">
          <motion.div
            initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
          >
            <motion.img
              src={trophyImg}
              alt="Grand Winner trophy"
              className="w-[140px] sm:w-[190px] md:w-[230px]"
              animate={
                reduce
                  ? {}
                  : { filter: ["brightness(1)", "brightness(1.25)", "brightness(1)"] }
              }
              transition={reduce ? {} : { duration: 2.5, delay: 1, repeat: Infinity, repeatDelay: 4 }}
            />
          </motion.div>
        </div>

        {/* Connector: Grand Winner -> two category badges */}
        <div className="relative md:-mt-4">
          <svg viewBox="0 0 800 90" className="h-[28px] w-full sm:h-[34px] md:h-[40px]" preserveAspectRatio="none">
            <defs>
              <linearGradient id="elbowGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-navy-mid)" />
                <stop offset="100%" stopColor="var(--color-brand-lime)" />
              </linearGradient>
            </defs>
            <motion.path
              d="M388 0 V30 H200 V90 M412 0 V30 H600 V90"
              stroke="url(#elbowGrad)"
              strokeWidth="3"
              fill="none"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={lineTransition}
            />
          </svg>
        </div>

        {/* Wraps both badge rows so the connecting line can be absolutely
            positioned behind them, running from under Next Gen up to just
            past Advance Concrete Tech. The viewBox is 0–1000 on both axes,
            i.e. each unit is 0.1% of this container — nudge the path below
            to adjust the curve. */}
        <div className="relative">
          <svg
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
          >
            <defs>
              <linearGradient id="hierarchyLineGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-navy-mid)" />
                <stop offset="55%" stopColor="var(--color-brand-cyan)" />
                <stop offset="100%" stopColor="var(--color-brand-lime)" />
              </linearGradient>
            </defs>
            <motion.path
              d="M190 985 H400 Q450 985 470 930 L570 500 Q590 446 640 446 H810"
              stroke="url(#hierarchyLineGrad)"
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ ...lineTransition, delay: reduce ? 0 : 0.2 }}
            />
          </svg>

          <div className="relative z-10 grid grid-cols-2 justify-items-center">
            <div className="flex justify-center">
              <CategoryBadge
                src={highPerfBadge}
                alt="High Performing Concrete Structure — 1 Winner"
                delay={0.1}
              />
            </div>
            <div className="flex justify-center">
              <CategoryBadge
                src={advancedBadge}
                alt="Advance Concrete Tech & Circularity — 1 Winner"
                delay={0.25}
              />
            </div>
          </div>

          <div className="relative z-10 mt-8 grid grid-cols-2 items-end justify-items-center sm:mt-10 md:mt-14">
            <div className="flex justify-center">
              <CategoryBadge
                src={nextGenBadge}
                alt="Next Generation Visionary Structure — 10 Winners"
                delay={0.1}
              />
            </div>

            <motion.div
              initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.3, ease: EASE }}
              className="flex justify-center justify-self-center"
            >
              <motion.img
                src={legendaryImg}
                alt="Legendary Structural Engineer"
                className="w-[130px] sm:w-[200px] md:w-[260px]"
                animate={
                  reduce ? {} : { filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"] }
                }
                transition={reduce ? {} : { duration: 2.2, delay: 1.4, repeat: Infinity, repeatDelay: 4 }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Prize money                                                        */
/* ------------------------------------------------------------------ */

export function PrizeMoney() {
  return (
    <section className="relative bg-navy-mid py-12 md:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <RevealUp>
          <span className="text-[11px] font-bold uppercase tracking-[3px] text-accent-cyan">
            **Total Prize Money**
          </span>
        </RevealUp>
        <RevealUp delay={0.1} className="mt-4">
          <p className="text-3xl font-bold tracking-tight text-gold sm:text-4xl md:text-6xl">
            BDT 5,00,000 
          </p>
         
        </RevealUp>
        <RevealUp delay={0.15} className="mt-5">
          <p className="text-lg font-semibold text-white/90">(Five Lac Taka Only)</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-white/50">
            **Conditions applied**
          </p>
        </RevealUp>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Evaluation criteria                                                 */
/* ------------------------------------------------------------------ */

type ScoreRow = {
  criteria: string;
  description?: string;
  scores: [string, string, string, string];
};

const EVALUATION_ROWS: ScoreRow[] = [
  {
    criteria: "Design & Technical Excellence",
    description: "Technical quality • Safety • Performance • Compliance",
    scores: ["30", "30", "25", "20"],
  },
  {
    criteria: "Innovation & Optimization",
    description: "Originality • Advanced Solutions • Optimization",
    scores: ["10", "15", "25", "20"],
  },
  {
    criteria: "Sustainability & Environmental Performance",
    description: "Material Efficiency • Durability • Embodied carbon • CO2 reduction",
    scores: ["20", "20", "20", "25"],
  },
  {
    criteria: "Constructability & Practical Implementation",
    description: "Construction technology • Feasibility • Buildability",
    scores: ["15", "15", "10", "10"],
  },
  {
    criteria: "Circularity & Resource Efficiency",
    description: "Resource • Recycling • Upcycling • Resource conservation",
    scores: ["—", "—", "—", "15"],
  },
  {
    criteria: "Life-Cycle Cost & Value Engineering",
    description: "Cost • Operation • Maintenance and long-term value",
    scores: ["10", "10", "10", "10"],
  },
  {
    criteria: "Presentation & Documentation",
    scores: ["15", "10", "10", "—"],
  },
];

const EVALUATION_COLUMNS = ["Category 1", "Category 2", "Category 3", "Grand Winner"];

export function EvaluationCriteria() {
  return (
    <section className="relative bg-white py-12 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <RevealUp>
          <div className="bg-navy-deep px-4 py-5 text-center sm:px-6 sm:py-6 md:px-10">
            <h2 className="text-xl font-bold uppercase tracking-wide text-white sm:text-2xl md:text-3xl">
              HSEA Evaluation Criteria
            </h2>
          </div>
        </RevealUp>

        <RevealUp delay={0.1}>
          <p className="mt-6 text-center text-sm text-slate-600 md:text-base">
            Each category should be judged independently on a{" "}
            <span className="font-bold text-navy-deep">100-point scale</span>.
          </p>
        </RevealUp>

        <RevealUp delay={0.15} className="mt-8">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <caption className="sr-only">
                HSEA evaluation criteria and points per category
              </caption>
              <thead>
                <tr className="bg-navy-deep text-white">
                  <th scope="col" className="px-3 py-3 text-xs font-bold uppercase tracking-wide sm:px-5 sm:py-4 sm:text-sm">
                    Criteria
                  </th>
                  {EVALUATION_COLUMNS.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wide sm:px-4 sm:py-4 sm:text-sm"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EVALUATION_ROWS.map((row) => (
                  <tr key={row.criteria} className="border-t border-slate-200 odd:bg-slate-50">
                    <th scope="row" className="px-3 py-3 align-top text-left font-semibold text-navy-deep sm:px-5 sm:py-4">
                      <span className="block text-xs sm:text-sm md:text-[15px]">{row.criteria}</span>
                      {row.description && (
                        <span className="mt-1 block text-[11px] font-normal text-slate-500 sm:text-xs">
                          {row.description}
                        </span>
                      )}
                    </th>
                    {row.scores.map((score, i) => (
                      <td
                        key={i}
                        className="px-2 py-3 text-center align-middle text-sm font-semibold text-navy-deep sm:px-4 sm:py-4 sm:text-base"
                      >
                        {score}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-gold bg-navy-deep text-white">
                  <th scope="row" className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide sm:px-5 sm:py-4 sm:text-sm">
                    Total
                  </th>
                  <td className="px-2 py-3 text-center text-base font-bold text-gold sm:px-4 sm:py-4 sm:text-lg">100</td>
                  <td className="px-2 py-3 text-center text-base font-bold text-gold sm:px-4 sm:py-4 sm:text-lg">100</td>
                  <td className="px-2 py-3 text-center text-base font-bold text-gold sm:px-4 sm:py-4 sm:text-lg">100</td>
                  <td className="px-2 py-3 text-center text-base font-bold text-gold sm:px-4 sm:py-4 sm:text-lg">100</td>
                </tr>
              </tbody>
            </table>
          </div>
        </RevealUp>

        <RevealUp delay={0.2} className="mt-8 border-l-2 border-gold pl-4 sm:pl-5">
          <p className="text-sm leading-relaxed text-slate-600">
            <span className="font-bold text-navy-deep">*Result:</span> The highest-scoring
            project in each category becomes the{" "}
            <span className="font-semibold text-navy-deep">Category Winner</span>.
          </p>
          <p className="mt-3 text-sm font-bold uppercase tracking-wide text-navy-deep">
            *Combined Grand Winner Evaluation
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Category 1 &amp; 2 winners will be reassessed using the Grand Winner criteria.
          </p>
        </RevealUp>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

const AwardsPrize = () => {
  return (
    <div className="bg-white text-slate-950">
      <Header />

      <WinnerHierarchy />
      <PrizeMoney />
      <EvaluationCriteria />

      <Footer />
    </div>
  );
};

export default AwardsPrize;
