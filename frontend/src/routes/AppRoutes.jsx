import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

import Dashboard from "../pages/Dashboard";
import Prediction from "../pages/Prediction";
import Recommendations from "../pages/Recommendations";
import DecisionHistory from "../pages/DecisionHistory";
import Prescriptions from "../pages/Prescriptions";
import ExecutedDecisions from "../pages/ExecutedDecisions";
import Analytics from "../pages/Analytics";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/prediction"
            element={<Prediction />}
          />

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

          <Route
            path="/executed-decisions"
            element={<ExecutedDecisions />}
          />

          <Route
            path="/execution-outcomes"
            element={<ExecutedDecisions />}
          />

          <Route
            path="/analytics"
            element={<Analytics />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;