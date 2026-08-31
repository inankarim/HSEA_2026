import { Routes, Route, Navigate } from "react-router-dom";
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

function App() {
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