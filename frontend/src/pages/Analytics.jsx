import { useEffect, useMemo, useState } from "react";
import { getExecutionOutcomes } from "../services/api";
import "./Analytics.css";

function Analytics() {
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getExecutionOutcomes();
      const data = response?.data || response;

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

    // Exact backend outcome_status matching
    const varianceCount = outcomes.filter(
      (item) => String(item.outcome_status || "").trim().toUpperCase() === "VARIANCE_DETECTED"
    ).length;

    const favorableCount = outcomes.filter(
      (item) => String(item.outcome_status || "").trim().toUpperCase() === "FAVORABLE"
    ).length;

    const onTargetCount = outcomes.filter(
      (item) => String(item.outcome_status || "").trim().toUpperCase() === "ON_TARGET"
    ).length;

    const averageCostVariance =
      total > 0 ? totalCostVariance / total : 0;

    const averageDeliveryVariance =
      total > 0 ? totalDeliveryVariance / total : 0;

    const varianceRate =
      total > 0 ? (varianceCount / total) * 100 : 0;

    const costAccuracy =
      totalExpectedCost > 0
        ? Math.max(
            0,
            100 -
              (Math.abs(totalCostVariance) / totalExpectedCost) * 100
          )
        : 0;

    // Decision ROI formula derived directly from realized cost savings vs planned budget:
    // ROI = (Total Expected Cost - Total Actual Cost) / Total Expected Cost * 100
    const decisionRoi =
      totalExpectedCost > 0
        ? ((totalExpectedCost - totalActualCost) / totalExpectedCost) * 100
        : 0;

    return {
      total,
      totalExpectedCost,
      totalActualCost,
      totalCostVariance,
      totalDeliveryVariance,
      varianceCount,
      favorableCount,
      onTargetCount,
      averageCostVariance,
      averageDeliveryVariance,
      varianceRate,
      costAccuracy,
      decisionRoi,
    };
  }, [outcomes]);

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderStatusBadge = (status) => {
    const normalized = String(status || "").trim().toUpperCase();
    if (normalized === "VARIANCE_DETECTED") {
      return <span className="status-badge variance">Variance Detected</span>;
    }
    if (normalized === "FAVORABLE") {
      return <span className="status-badge success">Favorable</span>;
    }
    if (normalized === "ON_TARGET") {
      return <span className="status-badge on-target">On Target</span>;
    }
    return <span className="status-badge">{status || "Recorded"}</span>;
  };

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
            {analytics.totalCostVariance > 0 ? "+" : ""}
            {formatCurrency(analytics.totalCostVariance)}
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
            {analytics.totalDeliveryVariance > 0 ? "+" : ""}
            {analytics.totalDeliveryVariance.toFixed(1)} days
          </strong>
        </div>

        <div className="analytics-card">
          <span>VARIANCES DETECTED</span>
          <strong className={analytics.varianceCount > 0 ? "negative" : ""}>
            {analytics.varianceCount}
          </strong>
        </div>

        <div className="analytics-card">
          <span>FAVORABLE OUTCOMES</span>
          <strong className="positive">
            {analytics.favorableCount}
          </strong>
        </div>

        <div className="analytics-card">
          <span>ON TARGET</span>
          <strong>{analytics.onTargetCount}</strong>
        </div>

        <div className="analytics-card">
          <span>COST ACCURACY</span>
          <strong>
            {analytics.costAccuracy.toFixed(1)}%
          </strong>
        </div>

        <div className="analytics-card">
          <span>DECISION ROI</span>
          <strong
            className={
              analytics.decisionRoi >= 0
                ? "positive"
                : "negative"
            }
          >
            {analytics.decisionRoi >= 0 ? "+" : ""}
            {analytics.decisionRoi.toFixed(1)}%
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
                {outcomes.map((item) => {
                  const cVar = Number(item.cost_variance || 0);
                  const dVar = Number(item.delivery_variance || 0);

                  return (
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

                      <td className={cVar > 0 ? "negative" : "positive"}>
                        {cVar > 0 ? "+" : ""}
                        {formatCurrency(cVar)}
                      </td>

                      <td>{item.expected_days} days</td>

                      <td>{item.actual_days} days</td>

                      <td className={dVar > 0 ? "negative" : "positive"}>
                        {dVar > 0 ? "+" : ""}
                        {dVar} days
                      </td>

                      <td>
                        {renderStatusBadge(item.outcome_status)}
                      </td>
                    </tr>
                  );
                })}
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

            <strong
              className={
                analytics.averageCostVariance > 0
                  ? "negative"
                  : analytics.averageCostVariance < 0
                  ? "positive"
                  : ""
              }
            >
              {analytics.averageCostVariance > 0 ? "+" : ""}
              {formatCurrency(analytics.averageCostVariance)}
            </strong>

            <p>
              Average difference between actual and expected cost
              across recorded outcomes.
            </p>
          </div>

          <div className="feedback-card">
            <span>Average Delivery Variance</span>

            <strong
              className={
                analytics.averageDeliveryVariance > 0
                  ? "negative"
                  : analytics.averageDeliveryVariance < 0
                  ? "positive"
                  : ""
              }
            >
              {analytics.averageDeliveryVariance > 0 ? "+" : ""}
              {analytics.averageDeliveryVariance.toFixed(1)} days
            </strong>

            <p>
              Average delivery delay compared with the optimized
              expectation.
            </p>
          </div>

          <div className="feedback-card">
            <span>Variance Rate</span>

            <strong className={analytics.varianceRate > 0 ? "negative" : ""}>
              {analytics.varianceRate.toFixed(1)}%
            </strong>

            <p>
              Percentage of recorded decisions that experienced adverse
              performance variances.
            </p>
          </div>

          <div className="feedback-card">
            <span>Decision Performance ROI</span>

            <strong
              className={
                analytics.decisionRoi >= 0
                  ? "positive"
                  : "negative"
              }
            >
              {analytics.decisionRoi >= 0 ? "+" : ""}
              {analytics.decisionRoi.toFixed(1)}%
            </strong>

            <p>
              Realized cost savings relative to expected optimization
              expenditure.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Analytics;