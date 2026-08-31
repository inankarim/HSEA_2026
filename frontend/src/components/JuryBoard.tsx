import { motion } from "framer-motion";
import FadeIn from "./FadeIn";
import Picture1 from "../assets/Picture1.png";
import Picture2 from "../assets/Picture2.png";
import Picture3 from "../assets/picture03_sub.png";
import Picture4 from "../assets/Picture4.png";
import Picture5 from "../assets/Picture5.png";

const jury = [
  { 
    name: "Dr. Raquib Ahsan", 
    role: "Professor Dept. of Civil Engineering, BUET", 
    image: Picture1
  },
  { 
    name: "Major General (Retd.) Nizam Ahmed", 
    role: "Executive Director, Ananta Group", 
    image: Picture2
  },
  { 
    name: "Engr. Abdullah Al Hossain Chowdhury", 
    role: "Managing Director & Lead Design Engineer, Inter Space Limited", 
    image: Picture3,
    position: "object-top"
  },
  { 
    name: "Engr A.K.M. Saiful Bari (P.Eng, BUET)", 
    role: "Structural Consultant, Pinnacle by Shanta", 
    image: Picture4
  },
  { 
    name: "Lt Col Dr. Khondaker Shakil Ahmed, PhD, PEng", 
    role: "Associate Professor, Dept of Civil Engineering, MIST", 
    image: Picture5
  },
];

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const card = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function JuryBoard() {
  return (
    <section className="bg-gray-200">
      <div className="mx-auto max-w-7xl lg:max-w-[1600px] xl:max-w-[1800px] px-6 py-12 sm:py-16 lg:py-20">
        <FadeIn>
          <h2 className="text-center text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-wide text-navy-deep">
            Jury Board
          </h2>
        </FadeIn>

        <motion.div
          className="mt-10 sm:mt-14 lg:mt-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 md:gap-6 lg:gap-10 xl:gap-14"
          variants={grid}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {jury.map((member, i) => (
            <motion.div key={i} variants={card} className="group text-center">
              <div className="relative w-full">
                {/* Person photo */}
                <div className="aspect-[4/5] object-top w-full bg-gray-100 overflow-hidden rounded-lg ring-1 ring-black/5 shadow-lg shadow-navy-deep/20 transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-navy-deep/30">
                  <img
                    src={member.image}
                    alt={member.name}
                    className={`w-full h-full object-cover ${member.position ?? "object-center"} transition-transform duration-300 group-hover:scale-110`}
                  />
                </div>

                {/* Name box: hidden by default, slides up and appears on hover (desktop) */}
                <div className="absolute bottom-0 left-0 right-0 px-3 sm:px-4 py-3 sm:py-4 bg-navy-deep bg-opacity-95 opacity-0 translate-y-3 pointer-events-none transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hidden sm:block rounded-b-lg">
                  <p className="text-left text-xs sm:text-sm lg:text-base font-bold uppercase tracking-wide text-white leading-tight">
                    {member.name}
                  </p>
                  <p className="mt-1.5 text-left text-[10px] sm:text-xs lg:text-sm text-white/90 leading-snug">
                    {member.role}
                  </p>
                </div>
              </div>

              {/* Default name info (mobile always shows, desktop shows when not hovering) */}
              <p className="mt-3 sm:mt-4 lg:mt-5 text-xs sm:text-sm lg:text-base font-bold text-navy-deep transition-opacity duration-300 sm:group-hover:opacity-0">
                {member.name}
              </p>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 leading-snug transition-opacity duration-300 sm:group-hover:opacity-0">
                {member.role}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}