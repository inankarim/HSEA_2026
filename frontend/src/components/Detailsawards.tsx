import { motion, useScroll } from "framer-motion";
import Header from "../components/Header";
import bg2 from "../assets/abouttheawards.jpeg";
import img from "../assets/dashbg2.jpg"
import Footer from "../components/Footer";

/* ================================================================ */
/*  IMAGE PATHS - Point to WebP (compressed) versions               */
/*  After running: npm run compress-images                          */
/* ================================================================ */

const IMAGE_ASSETS = {
  highRiseCoreStructure: "/assets/High-risecorestructure.webp",
  reinforcedConcreteJoint: "/assets/Reinforcedconcretejoint.webp",
  urbanBridgeSpan: "/assets/Urbanbridgespan.webp",
  sustainableUrbanSkyline: "/assets/Sustainableurbanskyline.webp",
};

/* ================================================================ */
/*  Shared editorial building blocks                                */
/* ================================================================ */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-[#C86F3D] origin-left z-[60]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

/** Slides content in from the side as it enters the viewport. */
function SlideIn({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  direction?: "left" | "right";
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: direction === "left" ? -60 : 60,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{
        once: true,
        amount: 0.3,
      }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}


/* ================================================================ */
/*  Optimized Architectural Image with Lazy Loading                 */
/* ================================================================ */

function ArchitecturalImage({
  image,
  category,
  caption,
  meta,
  aspect = "aspect-[4/5]",
  className = "",
}: {
  image: string;
  category: string;
  caption: string;
  meta: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`group relative overflow-hidden ${aspect} ${className}`}
      initial={{
        opacity: 0,
        y: 30,
        scale: 0.98,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{
        once: true,
        amount: 0.25,
      }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {/* Image with native lazy loading */}
      <motion.img
        src={image}
        alt={caption}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.055 }}
        transition={{
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
      />

      {/* Soft image overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-90" />

      {/* Subtle white highlight on hover */}
      <div className="absolute inset-0 bg-white/0 transition-colors duration-500 group-hover:bg-white/[0.03]" />

      {/* Category label */}
      <div className="absolute top-4 left-4">
        <span className="inline-flex text-[10px] font-bold uppercase tracking-[2px] text-[#171A1C] bg-white/85 backdrop-blur-md px-2.5 py-1.5">
          {category}
        </span>
      </div>

      {/* Arrow */}
      <motion.span
        initial={{
          opacity: 0,
          x: -5,
        }}
        whileHover={{
          opacity: 1,
          x: 0,
        }}
        transition={{
          duration: 0.3,
        }}
        className="absolute top-4 right-4 text-white text-lg leading-none"
      >
        ↗
      </motion.span>

      {/* Bottom information */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
        <motion.div
          initial={{
            y: 8,
            opacity: 0.85,
          }}
          whileHover={{
            y: 0,
            opacity: 1,
          }}
          transition={{
            duration: 0.4,
          }}
        >
          <p className="text-sm md:text-base font-semibold text-white">
            {caption}
          </p>

          <p className="mt-1 text-[10px] md:text-[11px] uppercase tracking-[1.5px] text-white/70">
            {meta}
          </p>
        </motion.div>

        <motion.span
          initial={{
            width: 0,
          }}
          whileHover={{
            width: 32,
          }}
          transition={{
            duration: 0.4,
          }}
          className="mt-3 block h-px bg-[#C86F3D]"
        />
      </div>
    </motion.div>
  );
}

/* ================================================================ */
/*  Principle Card                                                   */
/* ================================================================ */

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
        <line
          x1="0"
          y1="16"
          x2="200"
          y2="16"
          stroke="#C86F3D"
          strokeOpacity="0.3"
        />

        <line
          x1="0"
          y1="0"
          x2="0"
          y2="32"
          stroke="#C86F3D"
          strokeOpacity="0.3"
        />

        <line
          x1="200"
          y1="0"
          x2="200"
          y2="32"
          stroke="#C86F3D"
          strokeOpacity="0.3"
        />
      </svg>
    </motion.div>
  );
}

/* ================================================================ */
/*  Category Card                                                    */
/* ================================================================ */

function CategoryCard({
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
      className="group relative border-b border-r border-[#171A1C]/10 p-8 overflow-hidden cursor-default h-full flex flex-col"
    >
      <motion.div
        className="absolute inset-0 bg-[#EEF4F7]"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      <div className="relative flex flex-col flex-1">
        <span className="inline-block text-3xl font-light text-[#C86F3D] tabular-nums text-navy-deep">
          {number}
        </span>

        <h4 className="mt-5 text-base font-bold uppercase tracking-wide text-black">
          {title}
        </h4>

        <p className="mt-3 text-sm leading-relaxed text-[#66727A] flex-1">
          {description}
        </p>

        <motion.span
          initial={{
            x: 0,
            opacity: 0.4,
          }}
          whileHover={{
            x: 6,
            opacity: 1,
          }}
          transition={{ duration: 0.3 }}
          className="mt-6 inline-block text-[#171A1C]"
        >
          →
        </motion.span>
      </div>
    </motion.div>
  );
}

/* ================================================================ */
/*  Data                                                             */
/* ================================================================ */

const principles = [
  {
    number: "01",
    title: "Low-Carbon Systems",
    description:
      "Low-carbon structural systems designed to reduce environmental impact.",
  },
  {
    number: "02",
    title: "Resource Efficiency",
    description:
      "Optimized material usage without compromising structural performance.",
  },
  {
    number: "03",
    title: "Climate Resilience",
    description:
      "Structural solutions designed for Bangladesh's changing environmental conditions.",
  },
  {
    number: "04",
    title: "Structural Integrity",
    description:
      "Engineering excellence grounded in safety, durability, and performance.",
  },
];

const categories = [
  {
    number: "01",
    title: "Driving Sustainability",
    description:
      "Promoting low-carbon, resource-efficient, and environmentally responsible structural solutions that minimize ecological impact throughout the entire project lifecycle.",
  },
  {
    number: "02",
    title: "Fostering Innovation",
    description:
      "Recognizing groundbreaking engineering practices and emerging technologies — advanced structural systems, BIM integration, modular construction, and next-generation materials.",
  },
  {
    number: "03",
    title: "Recognizing Excellence",
    description:
      "Honoring exceptional technical competence, material efficiency, constructability, and engineering ingenuity guided by rigorous international codes and best practices.",
  },
  {
    number: "04",
    title: "Building Climate Resilience",
    description:
      "Championing structural designs that enhance safety, durability, and multi-hazard resilience against earthquakes, extreme weather, and rapid urbanization.",
  },
  {
    number: "05",
    title: "Advancing Industry Knowledge",
    description:
      "Bridging academia, research, and professional practice by fostering technical dialogue and the widespread adoption of proven engineering solutions.",
  },
  {
    number: "06",
    title: "Inspiring the Next Generation",
    description:
      "Showcasing visionary projects and the engineers behind them to inspire young professionals toward excellence and future leadership.",
  },
];

/* ================================================================ */
/*  Page                                                             */
/* ================================================================ */

const Detailsawards = () => {
  return (
    <div className="bg-[#F8FAFC] text-navy-deep]">
      <ScrollProgress />

      {/* ================================================================ */}
      {/* HERO                                                              */}
      {/* ================================================================ */}

<section className="relative w-full overflow-hidden bg-[#171A1C]">
  {/* Background Image */}
  <div className="absolute inset-0 overflow-hidden">
    <motion.img
      src={bg2}
      alt="About The Award Hero"
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
      {/* 01 — THE AWARD (centered)                                        */}
      {/* ================================================================ */}

      <section className="relative border-t border-b border-[#171A1C]/10">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <SlideIn>
              <p className="text-xs font-bold uppercase tracking-[3px] text-[#C86F3D]">
                The Award
              </p>

              <h2 className="mt-4 text-3xl md:text-5xl font-bold uppercase leading-tight text-navy-deep">
                The Platform For Structural Excellence
              </h2>

              <span className="mt-6 inline-block h-[3px] w-16 bg-[#C86F3D]" />
            </SlideIn>

            <SlideIn delay={0.15}>
              <div className="mt-8 space-y-6 text-[#66727A] leading-relaxed">
                <p className="text-lg text-[#171A1C]">
                  The Holcim Structural Excellence Awards 2026 (HSEA 2026) is a
                  premier  platform dedicated to honoring
                  extraordinary achievements in{" "}
                  <span className="text-[#C86F3D] font-semibold">
                    structural engineering
                  </span>
                  ,{" "}
                  <span className="text-[#C86F3D] font-semibold">
                    technical innovation
                  </span>
                  , and{" "}
                  <span className="text-[#C86F3D] font-semibold">
                    sustainable construction
                  </span>{" "}
                  across Bangladesh.
                </p>

                <p>
                  Grounded in LafargeHolcim Bangladesh PLC&apos;s commitment to
                  Building Progress for People and the Planet, the platform
                  stands as an authoritative benchmark celebrating the
                  visionaries who ensure our nation&apos;s growth is built on
                  strength, safety, and environmental responsibility.
                </p>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* WHY HSEA 2026? — SIX CATEGORIES                                  */}
      {/* ================================================================ */}

      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <SlideIn>
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-5xl font-bold uppercase leading-tight text-navy-deep">
                Why HSEA 2026?
              </h2>

              <div className="mt-4 flex items-center gap-4">
                <span className="h-px w-12 bg-[#C86F3D]" />
                <p className="text-xs font-bold uppercase tracking-[3px] text-[#C86F3D]">
                  Six Principles. One Vision. Built For The Future.
                </p>
              </div>
            </div>
          </SlideIn>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[#171A1C]/10 auto-rows-fr">
            {categories.map((c, index) => (
              <SlideIn key={c.number} delay={index * 0.1}>
                <CategoryCard {...c} />
              </SlideIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 02 — WHY NOW                                                      */}
      {/* ================================================================ */}

      <section className="relative bg-[#EEF4F7]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div>
            <SlideIn>
              <h2 className="text-3xl md:text-4xl font-bold uppercase leading-tight max-w-3xl text-navy-deep">
                The Structural Engineer Has Never Been More Important.
              </h2>
            </SlideIn>

            {/* Two Column Layout: Text Left, Large Image Right */}
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              {/* Left Column: Text + Two Small Images */}
              <div className="lg:col-span-5 flex flex-col">
                {/* Text */}
                <SlideIn delay={0.15}>
                  <div className="space-y-6 text-[23.22px] text-[#66727A] leading-relaxed">
                    <p>
                      As Bangladesh undergoes a historic transformation marked
                      by complex infrastructure and rapid urbanization, the
                      role of the structural engineer has never been more
                      critical.
                    </p>

                    <p>
                      HSEA 2026 spotlights the brilliant minds — engineers,
                      structural designers, and multi-disciplinary project
                      teams — whose technical expertise and creative
                      problem-solving push the boundaries of what is possible.
                    </p>

                    <p>
                      By elevating these contributions, the award highlights
                      how sophisticated structural design forms the silent,
                      essential backbone of safe, efficient, and iconic built
                      
                      environments.
                    </p>
                  </div>
                </SlideIn>

                {/* Two Small Images */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <SlideIn delay={0.25}>
                    <ArchitecturalImage
                      image={IMAGE_ASSETS.reinforcedConcreteJoint}
                      category="Detail"
                      caption="Reinforced concrete joint"
                      meta="Technical Detail"
                      aspect="aspect-square"
                    />
                  </SlideIn>

                  <SlideIn delay={0.3}>
                    <ArchitecturalImage
                      image={IMAGE_ASSETS.urbanBridgeSpan}
                      category="Infrastructure"
                      caption="Urban bridge span"
                      meta="Civil Engineering"
                      aspect="aspect-square"
                    />
                  </SlideIn>
                </div>
              </div>

              {/* Right Column: Large Image */}
              <SlideIn delay={0.2} className="lg:col-span-7">
                <ArchitecturalImage
                  image={IMAGE_ASSETS.highRiseCoreStructure}
                  category="Structural System"
                  caption="High-rise core structure"
                  meta="Engineering / Bangladesh"
                  aspect="aspect-[3/4]"
                  className="w-full"
                />
              </SlideIn>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 03 — ENGINEERING THE FUTURE                                     */}
      {/* ================================================================ */}

      <section className="relative bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-20 md:py-28">

          {/* Section heading */}
          <SlideIn direction="left">
            <div className="flex items-end justify-between gap-8">
              <div>
                <p className="mb-5 text-xs font-bold uppercase tracking-[3px] text-[#C86F3D]">
                  Engineering The Future
                </p>

                <h2 className="max-w-4xl text-3xl md:text-4xl lg:text-5xl font-bold uppercase leading-[0.92] tracking-tight text-navy-deep">
                  Building Stronger.
                  <br />
                  Building Smarter.
                  <br />
                  Building Responsibly.
                </h2>
              </div>

              <span className="hidden lg:block text-sm uppercase tracking-[2px] text-[#66727A] pb-2">
                03 / 04
              </span>
            </div>
          </SlideIn>


          {/* Image + text */}
          <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Large architectural image */}
            <SlideIn direction="left" className="lg:col-span-7">
              <ArchitecturalImage
                image={img}
                category="Engineering / Sustainability"
                caption="Building for a resilient future"
                meta="Structural Excellence / Bangladesh"
                aspect="aspect-[16/10]"
                className="w-full"
              />
            </SlideIn>


            {/* Description */}
            <SlideIn
              direction="right"
              delay={0.15}
              className="lg:col-span-5 flex items-center"
            >
              <div className="max-w-lg lg:pl-4">

                <div className="mb-7 flex items-center gap-4">
                  <span className="h-px w-12 bg-[#C86F3D]" />

                  <span className="text-xs font-bold uppercase tracking-[2px] text-[#66727A]">
                    Our Vision
                  </span>
                </div>

                <div className="space-y-6 text-[#66727A] leading-relaxed">

                  <p className="text-lg md:text-xl text-[#171A1C] font-medium leading-relaxed">
                    Inspired by Holcim&apos;s global leadership in net-zero
                    construction, HSEA 2026 responds directly to the climate
                    and resource challenges facing our deltaic landscape.
                  </p>

                  <p>
                    The platform actively champions low-carbon structural
                    systems, climate-resilient engineering, optimized material
                    usage, and innovative practices that minimize
                    environmental footprints without compromising structural
                    integrity.
                  </p>

                </div>

                {/* Small visual indicator */}
                <div className="mt-10 flex items-center gap-4">

                  <div className="h-px flex-1 bg-[#171A1C]/10" />
                </div>

              </div>
            </SlideIn>

          </div>


          {/* Principles */}
          <div className="mt-20 md:mt-28">

            <div className="mb-8 flex items-center gap-5">
              <span className="text-xs font-bold uppercase tracking-[3px] text-[#66727A]">
                Four Principles
              </span>

              <div className="h-px flex-1 bg-[#171A1C]/10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
              {principles.map((p) => (
                <PrincipleCard key={p.number} {...p} />
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* ================================================================ */}
      {/* 04 — MORE THAN AN AWARD                                          */}
      {/* ================================================================ */}

      <section className="relative bg-[#EEF4F7]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <SlideIn>
                <h2 className="text-3xl md:text-5xl font-bold uppercase leading-tight text-navy-deep">
                  More Than An Annual Accolade.
                </h2>

                <p className="mt-6 text-xl md:text-2xl font-semibold text-[#C86F3D] leading-snug text-navy-deep">
                  An institution for the future of structural excellence.
                </p>
              </SlideIn>

              <SlideIn delay={0.15}>
                <div className="mt-8  space-y-6 text-[#66727A] leading-relaxed max-w-xl">
                  <p>
                    More than an annual accolade, the Holcim Structural
                    Excellence Awards aspires to establish an enduring,
                    prestigious institution in Bangladesh.
                  </p>

                  <p>
                    By establishing high benchmarks of peer recognition,
                    nurturing emerging engineering talent, and fostering
                    collaboration across the construction ecosystem, HSEA
                    2026 is committed to inspiring a future-ready,
                    resilient, and sustainable built environment for
                    generations to come.
                  </p>
                </div>
              </SlideIn>
            </div>

            {/* OPTIMIZED VISION IMAGE */}
            <ArchitecturalImage
              image={IMAGE_ASSETS.sustainableUrbanSkyline}
              category="Vision"
              caption="Sustainable urban skyline"
              meta="Bangladesh / 2026"
              aspect="aspect-[4/5]"
            />
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}

      <Footer />
    </div>
  );
};

export default Detailsawards;