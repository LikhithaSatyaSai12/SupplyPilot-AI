import { useEffect, useMemo, useState } from "react";
import "./Analytics.css";

const API_URL = "http://127.0.0.1:8000";

function Analytics() {
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/execution-outcomes`);

      if (!response.ok) {
        throw new Error("Failed to load execution outcomes.");
      }

      const data = await response.json();

      setOutcomes(Array.isArray(data) ? data : [data].filter(Boolean));
    } catch (err) {
      console.error(err);
      setError("Unable to load execution outcome data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const analytics = useMemo(() => {
    const total = outcomes.length;

    const totalExpectedCost = outcomes.reduce(
      (sum, item) => sum + Number(item.expected_cost || 0),
      0
    );

    const totalActualCost = outcomes.reduce(
      (sum, item) => sum + Number(item.actual_cost || 0),
      0
    );

    const totalCostVariance = outcomes.reduce(
      (sum, item) => sum + Number(item.cost_variance || 0),
      0
    );

    const totalDeliveryVariance = outcomes.reduce(
      (sum, item) => sum + Number(item.delivery_variance || 0),
      0
    );

    const varianceCount = outcomes.filter(
      (item) => item.outcome_status === "Variance Detected"
    ).length;

    const successfulCount = outcomes.filter(
      (item) => item.outcome_status === "Within Expected Range"
    ).length;

    const averageCostVariance =
      total > 0 ? totalCostVariance / total : 0;

    const averageDeliveryVariance =
      total > 0 ? totalDeliveryVariance / total : 0;

    const costAccuracy =
      totalExpectedCost > 0
        ? Math.max(
            0,
            100 -
              (Math.abs(totalCostVariance) / totalExpectedCost) * 100
          )
        : 0;

    return {
      total,
      totalExpectedCost,
      totalActualCost,
      totalCostVariance,
      totalDeliveryVariance,
      varianceCount,
      successfulCount,
      averageCostVariance,
      averageDeliveryVariance,
      costAccuracy,
    };
  }, [outcomes]);

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <main className="analytics-page">
        <div className="analytics-header">
          <div>
            <span className="eyebrow">DECISION INTELLIGENCE</span>
            <h1>Decision Analytics</h1>
            <p>
              Measure the financial and operational performance of
              executed supply-chain decisions.
            </p>
          </div>
        </div>

        <div className="analytics-state">
          Loading analytics...
        </div>
      </main>
    );
  }

  return (
    <main className="analytics-page">
      <div className="analytics-header">
        <div>
          <span className="eyebrow">DECISION INTELLIGENCE</span>

          <h1>Decision Analytics</h1>

          <p>
            Measure the financial and operational performance of
            executed supply-chain decisions.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadAnalytics}
        >
          Refresh Data
        </button>
      </div>

      {error && (
        <div className="analytics-error">
          {error}
        </div>
      )}

      <section className="analytics-summary">
        <div className="analytics-card">
          <span>TOTAL OUTCOMES</span>
          <strong>{analytics.total}</strong>
        </div>

        <div className="analytics-card">
          <span>EXPECTED COST</span>
          <strong>
            {formatCurrency(analytics.totalExpectedCost)}
          </strong>
        </div>

        <div className="analytics-card">
          <span>ACTUAL COST</span>
          <strong>
            {formatCurrency(analytics.totalActualCost)}
          </strong>
        </div>

        <div className="analytics-card">
          <span>COST VARIANCE</span>
          <strong
            className={
              analytics.totalCostVariance > 0
                ? "negative"
                : "positive"
            }
          >
            {analytics.totalCostVariance >= 0 ? "+" : "-"}
            {formatCurrency(
              Math.abs(analytics.totalCostVariance)
            )}
          </strong>
        </div>

        <div className="analytics-card">
          <span>DELIVERY VARIANCE</span>
          <strong
            className={
              analytics.totalDeliveryVariance > 0
                ? "negative"
                : "positive"
            }
          >
            {analytics.totalDeliveryVariance >= 0 ? "+" : ""}
            {analytics.totalDeliveryVariance} days
          </strong>
        </div>

        <div className="analytics-card">
          <span>VARIANCES DETECTED</span>
          <strong>{analytics.varianceCount}</strong>
        </div>

        <div className="analytics-card">
          <span>WITHIN EXPECTATION</span>
          <strong>{analytics.successfulCount}</strong>
        </div>

        <div className="analytics-card">
          <span>COST ACCURACY</span>
          <strong>
            {analytics.costAccuracy.toFixed(1)}%
          </strong>
        </div>
      </section>

      <section className="analytics-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PERFORMANCE OVERVIEW</span>

            <h2>Decision ROI & Outcome Performance</h2>

            <p>
              Compare optimization expectations with real execution
              results to identify where the decision model is accurate
              and where it needs improvement.
            </p>
          </div>
        </div>

        {outcomes.length === 0 ? (
          <div className="analytics-state">
            No execution outcomes have been recorded yet.
          </div>
        ) : (
          <div className="analytics-table-container">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Supplier</th>
                  <th>Action</th>
                  <th>Expected Cost</th>
                  <th>Actual Cost</th>
                  <th>Cost Variance</th>
                  <th>Expected Days</th>
                  <th>Actual Days</th>
                  <th>Delivery Variance</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {outcomes.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>

                    <td>{item.supplier}</td>

                    <td>
                      <strong>{item.action}</strong>
                    </td>

                    <td>
                      {formatCurrency(item.expected_cost)}
                    </td>

                    <td>
                      {formatCurrency(item.actual_cost)}
                    </td>

                    <td
                      className={
                        Number(item.cost_variance) > 0
                          ? "negative"
                          : "positive"
                      }
                    >
                      {Number(item.cost_variance) >= 0
                        ? "+"
                        : "-"}
                      {formatCurrency(
                        Math.abs(Number(item.cost_variance || 0))
                      )}
                    </td>

                    <td>{item.expected_days} days</td>

                    <td>{item.actual_days} days</td>

                    <td
                      className={
                        Number(item.delivery_variance) > 0
                          ? "negative"
                          : "positive"
                      }
                    >
                      {Number(item.delivery_variance) >= 0
                        ? "+"
                        : ""}
                      {item.delivery_variance} days
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          item.outcome_status ===
                          "Variance Detected"
                            ? "variance"
                            : "success"
                        }`}
                      >
                        {item.outcome_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="analytics-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CLOSED-LOOP FEEDBACK</span>

            <h2>Optimization Feedback</h2>

            <p>
              Execution variances provide feedback about the quality
              of the original optimization decision.
            </p>
          </div>
        </div>

        <div className="feedback-grid">
          <div className="feedback-card">
            <span>Average Cost Variance</span>

            <strong className="negative">
              +{formatCurrency(
                Math.abs(analytics.averageCostVariance)
              )}
            </strong>

            <p>
              Average difference between expected and actual cost
              across recorded outcomes.
            </p>
          </div>

          <div className="feedback-card">
            <span>Average Delivery Variance</span>

            <strong className="negative">
              +{analytics.averageDeliveryVariance.toFixed(1)} days
            </strong>

            <p>
              Average delivery delay compared with the optimized
              expectation.
            </p>
          </div>

          <div className="feedback-card">
            <span>Variance Rate</span>

            <strong>
              {analytics.total > 0
                ? (
                    (analytics.varianceCount /
                      analytics.total) *
                    100
                  ).toFixed(1)
                : "0.0"}
              %
            </strong>

            <p>
              Percentage of recorded decisions that produced a
              measurable variance.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Analytics;