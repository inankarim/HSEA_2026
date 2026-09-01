import { motion, useScroll } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import bg2 from "../assets/jury.jpeg";

import picture1 from "../assets/Picture1.png";
import picture2 from "../assets/Picture2.png";
import picture3 from "../assets/picture03.jpeg";
import picture4 from "../assets/Picture4.png";
import picture5 from "../assets/Picture5.png";

/* ------------------------------------------------------------------ */
/*  Design tokens (shared with About Award / Award Categories pages)   */
/*  bg: #F8FAFC   panel: #EEF4F7   text: #171A1C                       */
/*  muted: #66727A   accent: #C86F3D                                   */
/* ------------------------------------------------------------------ */

const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  Shared editorial building blocks                                   */
/* ------------------------------------------------------------------ */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-[#C86F3D] origin-left z-[60]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

/** Masked line reveal — text rises up from behind an overflow-hidden mask. */
function MaskedLine({
  text,
  delay = 0,
  className = "",
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className={`block ${className}`}
        initial={{ y: "110%" }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, delay, ease: EASE }}
      >
        {text}
      </motion.span>
    </span>
  );
}

/** Fades a block up gently as it enters the viewport. */
function RiseIn({
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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionNumber({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex md:flex-col items-baseline md:items-start gap-3 md:gap-4">
      <span className="text-5xl md:text-6xl font-light text-[#C86F3D]/80 tabular-nums">
        {number}
      </span>
      <span className="text-xs font-bold uppercase tracking-[3px] text-[#66727A]">
        {label}
      </span>
    </div>
  );
}

function PrincipleCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative border-t border-[#171A1C]/10 pt-6"
    >
      <span className="text-4xl font-light text-[#C86F3D]/70 tabular-nums">
        {number}
      </span>
      <h4 className="mt-4 text-lg font-bold uppercase tracking-wide text-[#171A1C]">
        {title}
      </h4>
      <p className="mt-3 text-sm leading-relaxed text-[#66727A] max-w-xs">
        {description}
      </p>
      <svg
        className="mt-6 h-8 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        viewBox="0 0 200 32"
      >
        <line x1="0" y1="16" x2="200" y2="16" stroke="#C86F3D" strokeOpacity="0.3" />
        <line x1="0" y1="0" x2="0" y2="32" stroke="#C86F3D" strokeOpacity="0.3" />
        <line x1="200" y1="0" x2="200" y2="32" stroke="#C86F3D" strokeOpacity="0.3" />
      </svg>
    </motion.div>
  );
}

/**
 * A single jury member's editorial profile — large portrait on one side,
 * name/role/bio on the other. Alternates sides via `reverse`.
 */
function JuryProfile({
  image,
  name,
  designation,
  institution,
  bio,
  reverse = false,
}: {
  image: string;
  name: string;
  designation: string;
  institution: string;
  bio: string;
  reverse?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
      <div className={reverse ? "lg:order-2" : ""}>
        <motion.div
          initial={{ opacity: 0, scale: 1.04, clipPath: "inset(0 0 6% 0)" }}
          whileInView={{ opacity: 1, scale: 1, clipPath: "inset(0 0 0% 0)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE }}
          whileHover={{ scale: 1.015 }}
          className="relative aspect-[4/5] overflow-hidden border border-[#171A1C]/10"
        >
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700"
          />
        </motion.div>
      </div>

      <div className={reverse ? "lg:order-1" : ""}>
        <h3 className="text-2xl md:text-3xl font-bold uppercase leading-tight text-[#171A1C]">
          <MaskedLine text={name} delay={0} />
        </h3>

        <RiseIn delay={0.1} className="mt-3">
          <p className="text-sm font-bold uppercase tracking-[1.5px] text-[#C86F3D]">
            {designation}
          </p>
          <p className="mt-1 text-sm text-[#66727A]">{institution}</p>
        </RiseIn>

        <RiseIn delay={0.2} className="mt-6 max-w-md">
          <p className="text-[#66727A] leading-relaxed">{bio}</p>
        </RiseIn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const juryMembers = [
  {
    number: "01",
    image: picture1,
    name: "Dr. Raquib Ahsan",
    designation: "Professor",
    institution: "Department of Civil Engineering, BUET",
    bio: "Dr. Raquib Ahsan, Professor of Civil Engineering at BUET, holds a Ph.D. from University of Tokyo with 30+ years of expertise in academic, research, consultancy and structural engineering. A key stakeholder of updating Bangladesh National Building Code (BNBC) and former BUET- Japan Institute of Disaster Prevention and Urban Safety (JIDPUS) Director, he played a leading role in organizing major national and international events on disaster risk management. His extensive research spans structural retrofitting, soil, seismic vulnerability assessment, and disaster preparedness and so on. He has authored numerous publications and contributed extensively to natural communities like RAJUK, PWD and so on."
  },
  {
    number: "02",
    image: picture2,
    name: "Major General (Retd.) Nizam Ahmed",
    designation: "Executive Director",
    institution: "Ananta Group",
    bio: "Major General (Retd.) Nizam Ahmed is a retired high-ranking Bangladesh Army officerwho is currently serving as the Executive Director & Head of Development Works at Ananta Group. Prior to his business career, he served in the military for over three decades and held a position as the Board of Directors for Biman Bangladesh Airlines.Formerly he was the Head of Facilities Management at icddr,b and the Chairman of Benfix Steel Building Development Limited.",
  },
  {
    number: "03",
    image: picture3,
    name: "Engr. Abdullah Al Hossain Chowdhury",
    designation: "Managing Director & Lead Design Engineer",
    institution: "Inter Space Limited",
    bio: "Abdullah Al Hossain Chowdhury (Rizvi), PEng., is the Managing Director and Lead Design Engineer of Inter Space Limited with over 33 years of professional experience, expertising in the analysis and design of high rise buildings. A BUET graduate and IEB Fellow, he has engineered numerous landmark tall buildings shaping Bangladesh's skyline. As a life time member of ACECOMS (ATI), Bangkok, a member of the Bangladesh Earthquake Society (BES), As convenor and founding member of BASE and he continues to contribute to design excellence, research, professional development, and knowledge-sharing within the engineering community.",
  },
  {
    number: "04",
    image: picture4,
    name: "Engr. A.K.M. Saiful Bari (P.Eng, BUET)",
    designation: "Structural Consultant",
    institution: "Pinnacle by Shanta",
    bio: "Engr. A.K.M. Saiful Bari is a highly accomplished Professional Engineer and structural consultant with extensive experience in high-rise development and advanced structural design. His expertise in structural safety, engineering consultancy, and technical excellence contributes significantly to the Jury Board's evaluation of quality, integrity, and innovation in construction.",
  },
  {
    number: "05",
    image: picture5,
    name: "Lt Col Dr. Khondaker Shakil Ahmed, PhD, PEng",
    designation: "Associate Professor",
    institution: "Department of Civil Engineering, MIST",
    bio: "Lt Col Dr. Khondaker Sakil Ahmed is a Civil & Structural Engineering expert with 18 years of global experience across Bangladesh, Singapore, and Africa. A PhD/Post-Doc graduate from NUS, Chartered Engineer (UK), and ICE Fellow, he is an Associate Professor at MIST and General Secretary of CATS-MIST. His expertise spans tall buildings, bridges, finite element analysis, hazard-resistant design, with major leadership roles on landmark projects in home & abroad.",
  },
];

const principles = [
  {
    number: "01",
    title: "Voting Quorum",
    description:
      "Full participation of all five panel members is required to conduct official deliberations and finalize verdicts.",
  },
  {
    number: "02",
    title: "Voting Procedure",
    description:
      "Category winners are determined through majority consensus, after which the Jury Chair formally submits the results to the Award Director.",
  },
  {
    number: "03",
    title: "Quality Benchmark",
    description:
      "The Jury retains full authority to withhold an award in any category if submissions fail to meet the required standard of excellence.",
  },
  {
    number: "04",
    title: "Submission Oversight",
    description:
      "The Jury may reclassify entries into more appropriate categories or exclude submissions that do not satisfy competition requirements.",
  },
  {
    number: "05",
    title: "Verification & Integrity",
    description:
      "Any submission found to contain inaccurate, misleading, falsified, or unverified claims shall be subject to immediate disqualification.",
  },
  {
    number: "06",
    title: "Confidentiality & Finality",
    description:
      "All deliberations remain strictly confidential. Decisions of the Jury Board are final, binding, and non-appealable.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const JuryPage = () => {
  return (
    <div className="bg-[#F8FAFC] text-[#171A1C]">
      <ScrollProgress />

      {/* HERO — Detailsawards style (contained image, no title overlay) */}
      <section className="relative w-full overflow-hidden bg-[#171A1C]">
        {/* Background Image */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            src={bg2}
            alt="Jury Board Hero"
            className="absolute inset-0 w-full h-full object-contain object-center"
          />
        </div>

        {/* Spacer - maintains fixed height */}
        <div className="w-full h-[55vh] min-h-[380px] md:min-h-[440px]" />



        {/* Header Scrim - from top */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20">
          <Header />
        </div>
      </section>

      {/* 01 — THE JURY BOARD */}
      <section className="relative border-t border-[#171A1C]/5">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10 md:gap-16">
          <SectionNumber number="01" label="The Jury Board" />

          <div>
            <h2 className="text-3xl md:text-5xl font-bold uppercase leading-tight max-w-3xl">
              <MaskedLine text="Independent. Experienced. Respected." />
            </h2>

            <RiseIn delay={0.15}>
              <div className="mt-10 space-y-6 max-w-2xl text-[#66727A] leading-relaxed">
                <p>
                  The Holcim Structural Excellence Awards (HSEA) are
                  evaluated by an independent five-member Jury Board
                  established to ensure technical rigor, academic depth, and
                  an objective evaluation process. The panel combines
                  nationally recognized structural engineering expertise
                  with industry leadership and interdisciplinary insight.
                </p>
                <p>
                  The Jury Board is entrusted with identifying projects that
                  demonstrate excellence in engineering performance,
                  innovation, sustainability, and long-term contribution to
                  Bangladesh&apos;s built environment.
                </p>
              </div>
            </RiseIn>
          </div>
        </div>
      </section>
      {/* 03 — MEET THE JURY */}
      <section className="relative bg-white">
        <div className="mx-auto max-w-7xl px-6 pt-20 md:pt-28">
          <RiseIn>
            <p className="text-xs font-bold uppercase tracking-[3px] text-[#C86F3D]">
              Meet The Jury
            </p>
          </RiseIn>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold uppercase leading-tight max-w-3xl">
            <MaskedLine text="The Panel" />
          </h2>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24 space-y-24 md:space-y-40">
          {juryMembers.map((member, i) => (
            <JuryProfile key={member.number} {...member} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* 04 — EVALUATION PRINCIPLES */}
      <section className="relative bg-[#EEF4F7]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-10 md:gap-16">
            <SectionNumber number="04" label="Evaluation Principles" />

            <div>
              <h2 className="text-3xl md:text-5xl font-bold uppercase leading-tight max-w-3xl">
                <MaskedLine text="Integrity At Every Stage" />
              </h2>

              <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-6">
                {principles.map((p) => (
                  <PrincipleCard key={p.number} {...p} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLOSING STATEMENT */}
      <section className="relative bg-white">
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-36 text-center">
          <h2 className="text-3xl md:text-5xl font-bold uppercase leading-tight">
            <MaskedLine text="Guardians Of Excellence" />
          </h2>

          <RiseIn delay={0.2} className="mt-8">
            <p className="text-[#66727A] leading-relaxed">
              The credibility of the Holcim Structural Excellence Awards
              rests upon the independence, expertise, and integrity of its
              Jury Board. Through rigorous evaluation and objective
              judgment, the panel ensures that every recognition reflects
              the highest standards of structural engineering excellence
              and professional achievement.
            </p>
          </RiseIn>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default JuryPage;