import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";
import bg2 from "../assets/awardcart.webp";

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

      <Footer />
    </div>
  );
};

export default EligibilityCriteria;
