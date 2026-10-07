import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import bg2 from "../assets/eligibilty.webp";

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

type CriteriaItem = string | { primary: string; or: string };

type CriteriaKey = "practicing" | "nextGen";

const CRITERIA_SETS: Record<CriteriaKey, { intro: string; items: CriteriaItem[] }> = {
  practicing: {
    intro:
      "Designed for practicing structural engineers and engineering teams delivering real-world structural milestones across Bangladesh.",
    items: [
      "Projects must be physically located within Bangladesh.",
      {
        primary: "Real-world projects fully completed within the last 5 years",
        or: "Ongoing projects that have reached at least ≥ 50% construction completion",
      },
      "The project must be led by a full member of The Institution of Engineers, Bangladesh (IEB).",
      "The structural design and execution must strictly comply with the Bangladesh National Building Code (BNBC) and possess all necessary regulatory approvals.",
    ],
  },
  nextGen: {
    intro:
      "Designed to foster innovation, creativity, and leadership among emerging talent in the structural engineering domain.",
    items: [
      "Final-year structural/civil engineering students.",
      "Early-career structural engineers (up to IEB Associate Member status).",
    ],
  },
};

const CATEGORY_MAP: Record<string, { name: string; criteria: CriteriaKey }> = {
  "high-performance": {
    name: "High Performance Concrete Structure",
    criteria: "practicing",
  },
  "advanced-construction": {
    name: "Advanced Construction Technology & Circularity",
    criteria: "practicing",
  },
  "visionary-design": {
    name: "Next Generation Visionary Design",
    criteria: "nextGen",
  },
};

const DEFAULT_CATEGORY_KEY = "high-performance";

function CriteriaRow({
  item,
  index,
  isLast,
}: {
  item: CriteriaItem;
  index: number;
  isLast: boolean;
}) {
  const isGrouped = typeof item !== "string";

  return (
    <li className="relative flex gap-6">
      {!isLast && (
        <span className="absolute left-5 top-11 bottom-[-2.5rem] w-px bg-slate-200" />
      )}

      <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="flex-1 pt-1.5 pb-10">
        {isGrouped ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] leading-relaxed text-slate-700">
              {item.primary}
            </p>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-[2px] text-blue-900">
                Or
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <p className="text-[15px] leading-relaxed text-slate-700">
              {item.or}
            </p>
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed text-slate-700">{item}</p>
        )}
      </div>
    </li>
  );
}

const EligibilityCriteria = () => {
  const [searchParams] = useSearchParams();
  const categoryKey = searchParams.get("category") || DEFAULT_CATEGORY_KEY;
  const category = CATEGORY_MAP[categoryKey] || CATEGORY_MAP[DEFAULT_CATEGORY_KEY];
  const criteria = CRITERIA_SETS[category.criteria];

  return (
    <div className="bg-white text-slate-950">
      <Header />

      {/* HERO */}
      <section className="relative w-full overflow-hidden bg-[#171A1C]">
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            src={bg2}
            alt="Eligibility Criteria Hero"
            className="absolute inset-0 w-full h-full object-contain object-center"
          />
        </div>

        <div className="w-full aspect-[4/1]" />
      </section>

      {/* ================================================================ */}
      {/* ELIGIBILITY CRITERIA (category-aware)                            */}
      {/* ================================================================ */}

      <section className="relative bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <RevealUp>
              <span className="text-[10px] font-bold uppercase tracking-[3px] text-blue-900">
                Eligibility Criteria
              </span>
            </RevealUp>

            <RevealUp delay={0.1} className="mt-4">
              <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight leading-[1.05] text-slate-950">
                {category.name}
              </h2>
              <span className="mt-6 inline-block h-[3px] w-16 bg-blue-900" />
            </RevealUp>

            <RevealUp delay={0.15} className="mt-8">
              <p className="text-lg leading-relaxed text-slate-500">
                {criteria.intro}
              </p>
            </RevealUp>
          </div>

          <RevealUp delay={0.2} className="mt-16">
            <ul className="mx-auto max-w-2xl">
              {criteria.items.map((item, index) => (
                <CriteriaRow
                  key={typeof item === "string" ? item : item.primary}
                  item={item}
                  index={index}
                  isLast={index === criteria.items.length - 1}
                />
              ))}
            </ul>
          </RevealUp>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default EligibilityCriteria;
