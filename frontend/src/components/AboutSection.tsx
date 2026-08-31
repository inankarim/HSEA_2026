import { motion } from "framer-motion";
import image from "../assets/award.jpeg";
import FadeIn from "./FadeIn";
import { Link } from "react-router-dom";
const MotionLink = motion(Link);
export default function AboutSection() {
  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-start">
        {/* Side image, stacked cards like the reference */}
       <div className="relative h-96 sm:h-[420px] md:h-[480px] lg:[520px] mx-auto w-full max-w-sm md:max-w-none">
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-4 sm:top-10 h-64 w-64 sm:h-96 sm:w-96 md:h-[440px] md:w-[440px] rounded-2xl bg-gray-300"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            />
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 sm:left-8 sm:translate-x-0 md:left-10 top-10 sm:top-14 md:top-16 h-64 w-64 sm:h-96 sm:w-96 md:h-[440px] md:w-[440px] rounded-2xl overflow-hidden shadow-xl"
              initial={{ opacity: 0, y: 30 }}
              viewport={{ once: true, amount: 0.3 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              whileHover={{ scale: 1.03 }}
            >
              <img
                src={image}
                alt="About LafargeHolcim Excellence Award"
                className="h-full w-full object-cover"
              />
            </motion.div>
        </div>
        {/* Copy */}
        <FadeIn delay={0.1}>
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wide text-navy-deep text-center md:text-left">
            About Us
          </h2>
          <div className="mt-6 space-y-5 text-gray-600 leading-relaxed text-sm sm:text-base text-center md:text-left">
            <p>
              The Holcim Structural Excellence Awards 2026 (HSEA 2026) is a premier national platform dedicated to honoring extraordinary achievements in structural engineering, technical innovation, and sustainable construction across Bangladesh. Grounded in LafargeHolcim Bangladesh PLC’s commitment to Building Progress for People and the Planet, the awards celebrate the visionaries who are redefining the strength, efficiency, and environmental resilience of our nation’s built environment.
            </p>
          </div>
          <div className="mt-6 space-y-5 text-gray-600 leading-relaxed text-sm sm:text-base text-center md:text-left">
            <p>
            HSEA 2026 serves as a definitive benchmark of peer recognition, celebrating structural engineers, design experts, and project teams whose technical brilliance and creative problem-solving push the boundaries of modern engineering. In an era marked by rapid urbanization and climate challenges, the platform champion’s low-carbon structural solutions, climate-resilient design, optimized material performance, and circular construction practices. By bringing structural engineering to the forefront of sustainable development, HSEA 2026 aspires to inspire an enduring legacy of safe, efficient, and future-ready infrastructure for Bangladesh.
            </p>
          </div>
          <div className="flex justify-center md:justify-start">
            <MotionLink
              to="/awards/about"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="mt-6 inline-block rounded-lg bg-navy-deep px-6 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-deep/90 transition-colors"
            >
              See Details
            </MotionLink>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}