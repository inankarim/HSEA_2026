import { motion } from "framer-motion";
import FadeIn from "./FadeIn";

// Import your event images
import eventImage1 from "../assets/card1.png";
import eventImage2 from "../assets/card2.png";
import eventImage3 from "../assets/event3.jpg.webp";
import eventImage4 from "../assets/card4.png";
import eventImage5 from "../assets/card5.png";
import eventImage6 from "../assets/Urbanbridgespan.webp";

const events = [
  {
    title: "ECOPact contributes to LEED Gold certification of Arca, new building in Milan",
    description:
      "As a global leader in innovative and sustainable building solutions, our products play an essential role in the development of greener buildings and more liveable cities. For example, low-carbon concrete range of HOLCIM ECOPact offers 30% to 100% lower carbon compared to standard (CEM I) concrete.",
    date: "15 NOVEMBER 2024",
    image: eventImage1,
    link: "https://www.holcim.com/who-we-are/our-stories/ecopact-contributes-to-leed-gold-certification-of-arca-building-milan",
  },
  {
    title: "Holcim solutions enable Asia's largest urban rooftop farm",
    description:
      "With Elevate, Holcim can now bring greenery back into cities with a range of insulating, cool and green roofing systems.",
    image: eventImage2,
    link: "https://www.holcim.com/who-we-are/our-stories/firestone-roofing-enables-asias-largest-urban-rooftop-farm",
  },
  {
    title: "Striatus | 3D Concrete Printing Bridge | Holcim",
    description:
      "Striatus, the first-of-its-kind 3D Concrete Printed bridge, has been unveiled in Venice in July 2021. This innovative project is designed by Block Research Group and Zaha Hadid Architects, in collaboration with incremental3D and made possible by Holcim. Striatus establishes a new language for concrete that is digital, environmentally advanced and circular by design.",
    image: eventImage6,
    link: "https://www.holcim.com/who-we-are/our-stories/striatus-bridge",
  },
  {
    title: "Building the tallest tower in Africa with ECOPlanet saves up to 60% of CO2 emissions",
    description:
      "Deploying our low-carbon solutions to build greener and smarter cities is one of our top priorities. This is especially important in complex urbanization projects, such as the New Administrative Capital of Egypt, now being built outside of Cairo.",
    image: eventImage5,
    link: "https://www.holcim.com/media/media-releases/tallest-tower-in-africa-with-ecoplanet-green-cement",
  },
  {
    title: "Building the future of learning and teaching in Switzerland",
    description:
      "For this demanding project, HRS Real Estate AG relied on a product innovation from Holcim Switzerland that closes the material cycle: the resource-saving and low CO2 concrete.",
    image: eventImage4,
    link: "https://www.holcim.com/what-we-do/reference-projects/square-switzerland",
  },
  {
    title: "A new city life for Milan",
    description:
      "CityLife is one of the most important urban redevelopment projects in Europe. The project presents a comprehensive vision for the future of urban life.",
    image: eventImage3,
    link: "https://www.holcim.com/what-we-do/reference-projects/milan-city-life-only-holcim-can",
  },
];

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
} as const;

const card = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

export default function EventsSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:py-32">
        {/* Section Header */}
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-wide text-slate-950">
             GLOBAL HOLCIM PROJECTS
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
              Discover transformative projects celebrating structural excellence, innovation, and sustainable development.
            </p>
          </div>
        </FadeIn>

        {/* Events Grid */}
        <motion.div
          className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={grid}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {events.map((event) => (
            <motion.a
              key={event.title}
              href={event.link}
              variants={card}
              className="group relative flex flex-col bg-white hover:shadow-lg transition-shadow duration-300 h-full"
              whileHover={{ y: -4 }}
            >
              {/* Image Container */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
                {event.image ? (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-slate-200" />
                )}
              </div>

              {/* Content Container */}
              <div className="flex flex-col flex-grow p-6 md:p-8">
                {/* Date */}
                {event.date && (
                  <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
                    {event.date}
                  </p>
                )}

                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold leading-tight text-slate-950 mb-4 group-hover:text-blue-900 transition-colors">
                  {event.title}
                </h3>

                {/* Description */}
                <p className="text-sm md:text-base text-gray-600 leading-relaxed line-clamp-4">
                  {event.description}
                </p>

                {/* Spacer to push content up */}
                <div className="flex-grow" />

                {/* Read More Link */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-blue-900 group-hover:text-blue-700">
                    Read More
                    <svg
                      className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Subtle hover indicator line */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-900 origin-left"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}