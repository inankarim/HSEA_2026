import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Detailsawards from "./components/Detailsawards";
import Awardcategories from "./components/AwardCat";
import JuryPage from "./pages/JuryPage";
import SubmissionInstructions from "./pages/Submissioninstructions";
import SubmissionPortal from "./pages/Submissionportal";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import GeneralInfo from "./pages/GeneralInfo";
import WinnersInfo from "./pages/WinnersInfo";
import NotFound from "./pages/NotFound";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// Fires a GA4 page_view on every client-side route change. The base gtag
// snippet in index.html only tracks the very first load — without this,
// navigating between pages in this SPA would never register as separate
// pageviews in Analytics.
function usePageViews() {
  const location = useLocation();
  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) return;
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
}

function App() {
  usePageViews();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/awards/about" element={<Detailsawards />} />
      <Route path="/awards/categories" element={<Awardcategories />} />
      <Route path="/awards/general" element={<GeneralInfo />} />
      <Route path="/winners" element={<WinnersInfo />} />
      <Route path="/jury" element={<JuryPage />} />
      <Route path="/about" element={<Navigate to="/dashboard" replace />} />
      <Route path="/submit" element={<SubmissionInstructions />} />
      <Route path="/submission/:applicationId" element={<SubmissionPortal />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;