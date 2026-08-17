import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Prediction from "../pages/Prediction";
import Recommendations from "../pages/Recommendations";
import DecisionHistory from "../pages/DecisionHistory";
import Prescriptions from "../pages/Prescriptions";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/prediction" element={<Prediction />} />

        <Route
          path="/recommendations"
          element={<Recommendations />}
        />

        <Route
          path="/history"
          element={<DecisionHistory />}
        />

        <Route
          path="/prescriptions"
          element={<Prescriptions />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;