import { useEffect, useState } from "react";
import axios from "axios";
import "./ExecutedDecisions.css";

function ExecutedDecisions() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    loadExecutedDecisions();
  }, []);

  const loadExecutedDecisions = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/executed-decisions`
      );

      setDecisions(response.data);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load executed decisions. Please make sure the SupplyPilot-AI backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteDecision = async (decisionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this executed decision?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/executed-decisions/${decisionId}`
      );

      setDecisions((current) =>
        current.filter(
          (decision) => decision.id !== decisionId
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to delete the executed decision."
      );
    }
  };

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  return (
    <div className="executed-page">

      {/* PAGE HEADER */}
      <div className="executed-header">
        <div>
          <p className="executed-eyebrow">
            EXECUTION INTELLIGENCE
          </p>

          <h1>Executed Decisions</h1>

          <p className="executed-description">
            Review supply-chain actions that have been selected
            and executed through the optimization engine.
          </p>
        </div>

        <button
          className="executed-refresh-button"
          onClick={loadExecutedDecisions}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="executed-error">
          {error}
        </div>
      )}

      {/* SUMMARY */}
      <div className="execution-summary">

        <div className="execution-stat-card">
          <span className="execution-stat-label">
            TOTAL EXECUTIONS
          </span>

          <strong className="execution-stat-value">
            {decisions.length}
          </strong>
        </div>

        <div className="execution-stat-card">
          <span className="execution-stat-label">
            LATEST SUPPLIER
          </span>

          <strong className="execution-stat-text">
            {decisions.length > 0
              ? decisions[0].supplier
              : "None"}
          </strong>
        </div>

        <div className="execution-stat-card">
          <span className="execution-stat-label">
            LATEST ACTION
          </span>

          <strong className="execution-stat-text">
            {decisions.length > 0
              ? decisions[0].action
              : "None"}
          </strong>
        </div>

      </div>

      {/* EXECUTION HISTORY */}
      <section className="execution-history">

        <div className="execution-section-header">
          <div>
            <p className="executed-eyebrow">
              EXECUTION HISTORY
            </p>

            <h2>
              Supply-Chain Execution Records
            </h2>

            <p>
              Actions selected from supplier prescriptions
              are recorded here for traceability.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="execution-empty">
            <h3>Loading execution records...</h3>
            <p>
              Retrieving executed supply-chain decisions.
            </p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="execution-empty">
            <h3>No executed decisions yet</h3>

            <p>
              Execute a supplier prescription to create
              an execution record.
            </p>
          </div>
        ) : (
          <div className="execution-table-wrapper">

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
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {decisions.map((decision) => (

                  <tr key={decision.id}>

                    <td>
                      <strong>
                        #{decision.id}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {decision.supplier}
                      </strong>
                    </td>

                    <td>
                      {Number(
                        decision.quantity
                      ).toLocaleString("en-IN")}
                    </td>

                    <td>
                      <span
                        className={`risk-badge risk-${String(
                          decision.risk
                        ).toLowerCase()}`}
                      >
                        {decision.risk}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {decision.action}
                      </strong>
                    </td>

                    <td className="description-cell">
                      {decision.description}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          decision.expected_cost
                        )}
                      </strong>
                    </td>

                    <td>
                      {decision.expected_days} days
                    </td>

                    <td>
                      <span
                        className={`risk-badge risk-${String(
                          decision.expected_risk
                        ).toLowerCase()}`}
                      >
                        {decision.expected_risk}
                      </span>
                    </td>

                    <td>
                      {decision.executed_at}
                    </td>

                    <td>
                      <button
                        className="delete-execution-button"
                        onClick={() =>
                          deleteDecision(
                            decision.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}

export default ExecutedDecisions;