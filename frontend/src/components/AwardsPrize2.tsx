import Header from "../components/Header";
import Footer from "../components/Footer";
import { EvaluationCriteria } from "./AwardsPrize";
import prizeBanner from "../assets/banner2.png";

const AwardsPrize2 = () => {
  return (
    <div className="bg-white text-slate-950">
      <Header />

      <section className="relative w-full overflow-hidden bg-white">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={prizeBanner}
            alt="Grand Winner BDT 5,00,000, category winners, Next Generation and Legendary Structural Engineer awards"
            className="absolute inset-0 h-full w-full object-contain object-center"
          />
        </div>
        <div className="w-full aspect-[4/1]" />
      </section>

    
      <EvaluationCriteria />

      <Footer />
    </div>
  );
};

export default AwardsPrize2;
