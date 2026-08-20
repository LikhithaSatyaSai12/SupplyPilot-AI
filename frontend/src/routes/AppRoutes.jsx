import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

import Login from "../pages/Login";
import Register from "../pages/Register";

import Dashboard from "../pages/Dashboard";
import Prediction from "../pages/Prediction";
import Recommendations from "../pages/Recommendations";
import DecisionHistory from "../pages/DecisionHistory";
import Prescriptions from "../pages/Prescriptions";
import ExecutedDecisions from "../pages/ExecutedDecisions";
import Analytics from "../pages/Analytics";

function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem("supplypilot_logged_in");

  return isLoggedIn === "true" ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Application */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
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

          <Route
            path="/executed-decisions"
            element={<ExecutedDecisions />}
          />

          <Route
            path="/execution-outcomes"
            element={<ExecutedDecisions />}
          />

          <Route path="/analytics" element={<Analytics />} />
        </Route>

        {/* Unknown URL */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;