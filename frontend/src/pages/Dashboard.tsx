import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import DashboardHero from "../components/Dashboardhero";
import AnnouncementTicker from "../components/AnnouncementTicker";
import IntroSection from "../components/IntroSection";
import KeyDates from "../components/KeyDates";
import AboutSection from "../components/AboutSection";
import JuryBoard from "../components/JuryBoard";
import EventsSection from "../components/EventsSection";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Brand from "../components/Brand";

export default function Dashboard() {
  const location = useLocation();

  // If we navigated here with a scrollTo target (e.g. from "About Us"), scroll to it
  useEffect(() => {
    const state = location.state as { scrollTo?: string } | null;
    if (state?.scrollTo) {
      const timer = setTimeout(() => {
        const el = document.getElementById(state.scrollTo!);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        // Clear the state so refreshing/navigating back doesn't re-trigger the scroll
        window.history.replaceState({}, document.title);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />
      <DashboardHero />
      <AnnouncementTicker />

      {/* New sections, following the reference layout */}
      <IntroSection />
      <KeyDates />
      <div id="about-us">
        <AboutSection />
      </div>
      <JuryBoard />
      <EventsSection />
      <Brand/>
      <Footer />
    </div>
  );
}