import { useEffect, useState } from "react";
import axios from "axios";
import "./ExecutedDecisions.css";

function ExecutedDecisions() {
  const [executions, setExecutions] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = "http://127.0.0.1:8000";

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [executionResponse, outcomeResponse] = await Promise.all([
        axios.get(`${API_URL}/executed-decisions`),
        axios.get(`${API_URL}/execution-outcomes`),
      ]);

      setExecutions(executionResponse.data || []);
      setOutcomes(outcomeResponse.data || []);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load execution data. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteExecution = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this executed decision?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/executed-decisions/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
      setError("Unable to delete the executed decision.");
    }
  };

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const getOutcomeForExecution = (executionId) => {
    return outcomes.find(
      (outcome) => outcome.executed_decision_id === executionId
    );
  };

  const totalExecutions = executions.length;

  const latestExecution = executions.length > 0 ? executions[0] : null;

  const varianceCount = outcomes.filter(
    (item) => item.outcome_status === "Variance Detected"
  ).length;

  const successfulCount = outcomes.filter(
    (item) => item.outcome_status === "Within Expected Range"
  ).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="eyebrow">EXECUTION INTELLIGENCE</p>

          <h1>Executed Decisions</h1>

          <p className="page-description">
            Review supply-chain actions that have been selected and executed
            through the optimization engine.
          </p>
        </div>

        <button className="secondary-button" onClick={loadData}>
          Refresh Data
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state">
          Loading execution intelligence...
        </div>
      ) : (
        <>
          <section className="execution-summary">
            <div className="summary-card">
              <span>TOTAL EXECUTIONS</span>
              <strong>{totalExecutions}</strong>
            </div>

            <div className="summary-card">
              <span>LATEST SUPPLIER</span>
              <strong>
                {latestExecution ? latestExecution.supplier : "—"}
              </strong>
            </div>

            <div className="summary-card">
              <span>LATEST ACTION</span>
              <strong>
                {latestExecution ? latestExecution.action : "—"}
              </strong>
            </div>

            <div className="summary-card">
              <span>VARIANCES DETECTED</span>
              <strong>{varianceCount}</strong>
            </div>
          </section>

          <section className="execution-section">
            <div className="section-heading">
              <p className="eyebrow">EXECUTION HISTORY</p>

              <h2>Supply-Chain Execution Records</h2>

              <p>
                Actions selected from supplier prescriptions are recorded here
                for traceability.
              </p>
            </div>

            {executions.length === 0 ? (
              <div className="empty-state">
                No executed decisions have been recorded yet.
              </div>
            ) : (
              <div className="table-container">
                <table className="execution-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Supplier</th>
                      <th>Quantity</th>
                      <th>Risk</th>
                      <th>Action</th>
                      <th>Description</th>
                      <th>Expected Cost</th>
                      <th>Delivery</th>
                      <th>Expected Risk</th>
                      <th>Executed At</th>
                      <th>Outcome</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {executions.map((execution) => {
                      const outcome = getOutcomeForExecution(execution.id);

                      return (
                        <tr key={execution.id}>
                          <td>#{execution.id}</td>

                          <td>
                            <strong>{execution.supplier}</strong>
                          </td>

                          <td>{execution.quantity}</td>

                          <td>
                            <span
                              className={`risk-badge ${execution.risk
                                ?.toLowerCase()
                                .replace(/\s+/g, "-")}`}
                            >
                              {execution.risk}
                            </span>
                          </td>

                          <td>
                            <strong>{execution.action}</strong>
                          </td>

                          <td>{execution.description}</td>

                          <td>
                            <strong>
                              {formatCurrency(execution.expected_cost)}
                            </strong>
                          </td>

                          <td>{execution.expected_days} days</td>

                          <td>{execution.expected_risk}</td>

                          <td>{execution.executed_at}</td>

                          <td>
                            {outcome ? (
                              <span
                                className={`outcome-badge ${
                                  outcome.outcome_status ===
                                  "Variance Detected"
                                    ? "variance"
                                    : "success"
                                }`}
                              >
                                {outcome.outcome_status}
                              </span>
                            ) : (
                              <span className="outcome-badge pending">
                                Not Recorded
                              </span>
                            )}
                          </td>

                          <td>
                            <button
                              className="delete-button"
                              onClick={() =>
                                deleteExecution(execution.id)
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="outcomes-section">
            <div className="section-heading">
              <p className="eyebrow">EXECUTION OUTCOMES</p>

              <h2>Expected vs Actual Performance</h2>

              <p>
                Compare the planned supply-chain decision with the actual
                execution result.
              </p>
            </div>

            {outcomes.length === 0 ? (
              <div className="empty-state">
                No execution outcomes have been recorded yet.
              </div>
            ) : (
              <div className="outcome-grid">
                {outcomes.map((outcome) => (
                  <div className="outcome-card" key={outcome.id}>
                    <div className="outcome-card-header">
                      <div>
                        <span>OUTCOME #{outcome.id}</span>
                        <h3>{outcome.action}</h3>
                      </div>

                      <span
                        className={`outcome-badge ${
                          outcome.outcome_status === "Variance Detected"
                            ? "variance"
                            : "success"
                        }`}
                      >
                        {outcome.outcome_status}
                      </span>
                    </div>

                    <div className="outcome-info">
                      <div>
                        <span>Supplier</span>
                        <strong>{outcome.supplier}</strong>
                      </div>

                      <div>
                        <span>Quantity</span>
                        <strong>{outcome.quantity}</strong>
                      </div>

                      <div>
                        <span>Action ID</span>
                        <strong>{outcome.action_id}</strong>
                      </div>
                    </div>

                    <div className="comparison-grid">
                      <div className="comparison-column">
                        <h4>Expected</h4>

                        <p>
                          Cost
                          <strong>
                            {formatCurrency(outcome.expected_cost)}
                          </strong>
                        </p>

                        <p>
                          Delivery
                          <strong>{outcome.expected_days} days</strong>
                        </p>

                        <p>
                          Risk
                          <strong>{outcome.expected_risk}</strong>
                        </p>
                      </div>

                      <div className="comparison-column">
                        <h4>Actual</h4>

                        <p>
                          Cost
                          <strong>
                            {formatCurrency(outcome.actual_cost)}
                          </strong>
                        </p>

                        <p>
                          Delivery
                          <strong>{outcome.actual_days} days</strong>
                        </p>

                        <p>
                          Risk
                          <strong>{outcome.actual_risk}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="variance-summary">
                      <div>
                        <span>Cost Variance</span>
                        <strong>
                          {formatCurrency(outcome.cost_variance)}
                        </strong>
                      </div>

                      <div>
                        <span>Delivery Variance</span>
                        <strong>
                          {outcome.delivery_variance > 0
                            ? `+${outcome.delivery_variance} days`
                            : `${outcome.delivery_variance} days`}
                        </strong>
                      </div>
                    </div>

                    <div className="recorded-time">
                      Recorded: {outcome.recorded_at}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default ExecutedDecisions;