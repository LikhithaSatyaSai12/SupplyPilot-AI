import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import StatCard from "../components/StatCard";
import API from "../services/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function Dashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const response = await API.get("/history");

      setHistory(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const totalDecisions = history.length;

  const highRisk = history.filter(
    (item) => item.risk === "High"
  ).length;

  const mediumRisk = history.filter(
    (item) => item.risk === "Medium"
  ).length;

  const lowRisk = history.filter(
    (item) => item.risk === "Low"
  ).length;

  const riskData = [
    {
      name: "High",
      value: highRisk,
    },
    {
      name: "Medium",
      value: mediumRisk,
    },
    {
      name: "Low",
      value: lowRisk,
    },
  ];

  const latestDecision =
    history.length > 0 ? history[0] : null;

  return (
    <MainLayout>
      <h1>SupplyPilot-AI Dashboard</h1>

      {loading && <p>Loading dashboard...</p>}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {/* Statistics */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              marginTop: "30px",
              flexWrap: "wrap",
            }}
          >
            <StatCard
              title="Total Decisions"
              value={totalDecisions}
            />

            <StatCard
              title="High Risk"
              value={highRisk}
            />

            <StatCard
              title="Medium Risk"
              value={mediumRisk}
            />

            <StatCard
              title="Low Risk"
              value={lowRisk}
            />
          </div>

          {/* Risk Chart */}
          <div
            style={{
              marginTop: "40px",
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              maxWidth: "600px",
            }}
          >
            <h2>Risk Distribution</h2>

            {totalDecisions === 0 ? (
              <p>No risk data available.</p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={350}
              >
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} />
                    ))}
                  </Pie>

                  <Tooltip />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Latest Decision */}
          {latestDecision && (
            <div
              style={{
                marginTop: "30px",
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <h2>Latest Decision</h2>

              <p>
                <strong>Supplier:</strong>{" "}
                {latestDecision.supplier}
              </p>

              <p>
                <strong>Quantity:</strong>{" "}
                {latestDecision.quantity}
              </p>

              <p>
                <strong>Risk:</strong>{" "}
                {latestDecision.risk}
              </p>

              <p>
                <strong>Recommendation:</strong>{" "}
                {latestDecision.recommendation}
              </p>

              <p>
                <strong>Timestamp:</strong>{" "}
                {latestDecision.timestamp}
              </p>
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}

export default Dashboard;