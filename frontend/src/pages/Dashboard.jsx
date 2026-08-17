import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/history");

      console.log("Dashboard history:", response.data);

      setHistory(response.data);
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        "Unable to connect to the SupplyPilot-AI backend."
      );

      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalDecisions = history.length;

  const highRisk = history.filter(
    (item) =>
      String(item.risk).toLowerCase() === "high"
  ).length;

  const mediumRisk = history.filter(
    (item) =>
      String(item.risk).toLowerCase() === "medium"
  ).length;

  const lowRisk = history.filter(
    (item) =>
      String(item.risk).toLowerCase() === "low"
  ).length;

  const latestDecision =
    history.length > 0 ? history[0] : null;

  const highPercentage =
    totalDecisions > 0
      ? Math.round((highRisk / totalDecisions) * 100)
      : 0;

  const mediumPercentage =
    totalDecisions > 0
      ? Math.round((mediumRisk / totalDecisions) * 100)
      : 0;

  const lowPercentage =
    totalDecisions > 0
      ? Math.round((lowRisk / totalDecisions) * 100)
      : 0;

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <div className="dashboard-header">

        <div>
          <span className="dashboard-eyebrow">
            SUPPLY CHAIN INTELLIGENCE
          </span>

          <h1>
            SupplyPilot-AI Dashboard
          </h1>

          <p>
            Monitor supplier decisions, risk levels,
            and recommendations from one place.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={loadDashboard}
        >
          Refresh Data
        </button>

      </div>


      {/* ERROR */}

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}


      {/* STATISTICS */}

      <div className="dashboard-stats">

        <div className="dashboard-stat-card">

          <span>Total Decisions</span>

          <strong>
            {totalDecisions}
          </strong>

          <small>
            All supplier assessments
          </small>

        </div>


        <div className="dashboard-stat-card dashboard-stat-high">

          <span>High Risk</span>

          <strong>
            {highRisk}
          </strong>

          <small>
            Require immediate attention
          </small>

        </div>


        <div className="dashboard-stat-card dashboard-stat-medium">

          <span>Medium Risk</span>

          <strong>
            {mediumRisk}
          </strong>

          <small>
            Require monitoring
          </small>

        </div>


        <div className="dashboard-stat-card dashboard-stat-low">

          <span>Low Risk</span>

          <strong>
            {lowRisk}
          </strong>

          <small>
            Normal monitoring
          </small>

        </div>

      </div>


      {/* RISK + LATEST */}

      <div className="dashboard-grid">

        {/* RISK DISTRIBUTION */}

        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>

              <h2>
                Risk Distribution
              </h2>

              <p>
                Current supplier decision breakdown
              </p>

            </div>

          </div>


          <div className="risk-distribution">

            <div className="risk-row">

              <div className="risk-row-top">

                <span>
                  High Risk
                </span>

                <strong>
                  {highRisk}
                </strong>

              </div>

              <div className="risk-bar">

                <div
                  className="risk-bar-high"
                  style={{
                    width: `${highPercentage}%`,
                  }}
                />

              </div>

              <small>
                {highPercentage}% of decisions
              </small>

            </div>


            <div className="risk-row">

              <div className="risk-row-top">

                <span>
                  Medium Risk
                </span>

                <strong>
                  {mediumRisk}
                </strong>

              </div>

              <div className="risk-bar">

                <div
                  className="risk-bar-medium"
                  style={{
                    width: `${mediumPercentage}%`,
                  }}
                />

              </div>

              <small>
                {mediumPercentage}% of decisions
              </small>

            </div>


            <div className="risk-row">

              <div className="risk-row-top">

                <span>
                  Low Risk
                </span>

                <strong>
                  {lowRisk}
                </strong>

              </div>

              <div className="risk-bar">

                <div
                  className="risk-bar-low"
                  style={{
                    width: `${lowPercentage}%`,
                  }}
                />

              </div>

              <small>
                {lowPercentage}% of decisions
              </small>

            </div>

          </div>

        </div>


        {/* LATEST DECISION */}

        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>

              <h2>
                Latest Decision
              </h2>

              <p>
                Most recent supplier assessment
              </p>

            </div>

          </div>


          {latestDecision ? (

            <div className="latest-decision">

              <div className="latest-item">

                <span>
                  Supplier
                </span>

                <strong>
                  {latestDecision.supplier}
                </strong>

              </div>


              <div className="latest-item">

                <span>
                  Quantity
                </span>

                <strong>
                  {latestDecision.quantity}
                </strong>

              </div>


              <div className="latest-item">

                <span>
                  Risk
                </span>

                <span
                  className={`dashboard-risk-badge dashboard-risk-${String(
                    latestDecision.risk
                  ).toLowerCase()}`}
                >
                  {latestDecision.risk}
                </span>

              </div>


              <div className="latest-item">

                <span>
                  Timestamp
                </span>

                <strong>
                  {latestDecision.timestamp}
                </strong>

              </div>


              <div className="latest-recommendation">

                <span>
                  RECOMMENDATION
                </span>

                <p>
                  {latestDecision.recommendation}
                </p>

              </div>

            </div>

          ) : (

            <div className="dashboard-empty">

              <h3>
                No decisions yet
              </h3>

              <p>
                Run your first supplier prediction
                to see results here.
              </p>

            </div>

          )}

        </div>

      </div>


      {/* RECENT DECISIONS */}

      <div className="dashboard-card dashboard-recent">

        <div className="dashboard-card-header">

          <div>

            <h2>
              Recent Decisions
            </h2>

            <p>
              Latest supplier assessments
            </p>

          </div>

          <button
            className="view-history-button"
            onClick={() =>
              navigate("/history")
            }
          >
            View All
          </button>

        </div>


        {history.length === 0 ? (

          <div className="dashboard-empty">

            <h3>
              No recent decisions
            </h3>

            <p>
              Your supplier decisions will appear here.
            </p>

          </div>

        ) : (

          <div className="dashboard-table-wrapper">

            <table className="dashboard-table">

              <thead>

                <tr>

                  <th>ID</th>
                  <th>Supplier</th>
                  <th>Quantity</th>
                  <th>Risk</th>
                  <th>Recommendation</th>
                  <th>Timestamp</th>

                </tr>

              </thead>


              <tbody>

                {history
                  .slice(0, 5)
                  .map((item) => (

                    <tr key={item.id}>

                      <td>
                        #{item.id}
                      </td>

                      <td className="dashboard-supplier">
                        {item.supplier}
                      </td>

                      <td>
                        {Number(
                          item.quantity
                        ).toLocaleString()}
                      </td>

                      <td>

                        <span
                          className={`dashboard-risk-badge dashboard-risk-${String(
                            item.risk
                          ).toLowerCase()}`}
                        >
                          {item.risk}
                        </span>

                      </td>

                      <td className="dashboard-recommendation">
                        {item.recommendation}
                      </td>

                      <td className="dashboard-time">
                        {item.timestamp}
                      </td>

                    </tr>

                  ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* QUICK ACTIONS */}

      <div className="dashboard-quick-actions">

        <div className="quick-action-card">

          <div className="quick-action-icon">
            P
          </div>

          <div className="quick-action-content">

            <span className="quick-action-label">
              RISK ASSESSMENT
            </span>

            <h3>
              Run Supplier Prediction
            </h3>

            <p>
              Evaluate a supplier and estimate
              the risk level before placing an order.
            </p>

            <button
              className="quick-action-button"
              onClick={() =>
                navigate("/prediction")
              }
            >
              Run Prediction →
            </button>

          </div>

        </div>


        <div className="quick-action-card">

          <div className="quick-action-icon recommendation-icon">
            R
          </div>

          <div className="quick-action-content">

            <span className="quick-action-label">
              DECISION SUPPORT
            </span>

            <h3>
              Get Supplier Recommendation
            </h3>

            <p>
              Receive an actionable recommendation
              based on supplier risk and order quantity.
            </p>

            <button
              className="quick-action-button"
              onClick={() =>
                navigate("/recommendations")
              }
            >
              Get Recommendation →
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;