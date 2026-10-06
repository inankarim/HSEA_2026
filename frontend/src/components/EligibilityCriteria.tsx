import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import bg2 from "../assets/awardcart.webp";

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

const EligibilityCriteria = () => {
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
      {/* WHO CAN PARTICIPATE                                               */}
      {/* ================================================================ */}

      <section className="relative bg-white border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 text-center">
          <RevealUp>
            <span className="text-[10px] font-bold uppercase tracking-[2px] text-slate-400">
              Eligibility
            </span>
          </RevealUp>

          <RevealUp delay={0.1} className="mt-4">
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight leading-[1.02] text-slate-950">
              Who Can Participate
            </h2>
          </RevealUp>

          <RevealUp delay={0.15} className="mt-8">
            <p className="text-xl font-semibold md:text-lg text-slate-600 leading-relaxed">
              The Holcim Structural Excellence Awards 2026 (HSEA 2026) invites
              structural engineers, project teams, students, and early-career
              professionals across Bangladesh to showcase their innovations in
              sustainable structural design and engineering excellence.
            </p>
          </RevealUp>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default EligibilityCriteria;
