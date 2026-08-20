import { useEffect, useState } from "react";
import API from "../services/api";
import "./ExecutedDecisions.css";

function ExecutedDecisions() {
  const [decisions, setDecisions] = useState([]);
  const [outcomes, setOutcomes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);

  const [actualCost, setActualCost] = useState("");
  const [actualDays, setActualDays] = useState("");
  const [actualRisk, setActualRisk] = useState("Low");

  const [savingOutcome, setSavingOutcome] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [decisionsResponse, outcomesResponse] =
        await Promise.all([
          API.get("/executed-decisions"),
          API.get("/execution-outcomes"),
        ]);

      setDecisions(decisionsResponse.data);
      setOutcomes(outcomesResponse.data);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load execution data. Please make sure the SupplyPilot-AI backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const getOutcomeForDecision = (decisionId) => {
    return outcomes.find(
      (outcome) =>
        Number(outcome.executed_decision_id) === Number(decisionId)
    );
  };

  const openOutcomeForm = (decision) => {
    setSelectedDecision(decision);

    setActualCost("");
    setActualDays("");
    setActualRisk(decision.expected_risk || "Medium");

    setError("");
    setSuccess("");

    setShowOutcomeForm(true);
  };

  const closeOutcomeForm = () => {
    if (savingOutcome) {
      return;
    }

    setShowOutcomeForm(false);
    setSelectedDecision(null);

    setActualCost("");
    setActualDays("");
    setActualRisk("Low");
  };

  const handleRecordOutcome = async (event) => {
    event.preventDefault();

    if (!selectedDecision) {
      return;
    }

    if (!actualCost || Number(actualCost) < 0) {
      setError("Please enter a valid actual cost.");
      return;
    }

    if (!actualDays || Number(actualDays) <= 0) {
      setError("Please enter valid actual delivery days.");
      return;
    }

    try {
      setSavingOutcome(true);
      setError("");
      setSuccess("");

      const response = await API.post(
        "/execution-outcomes",
        {
          executed_decision_id: selectedDecision.id,
          actual_cost: Number(actualCost),
          actual_days: Number(actualDays),
          actual_risk: actualRisk,
        }
      );

      setOutcomes((current) => [
        response.data,
        ...current,
      ]);

      setSuccess(
        `Execution outcome for decision #${selectedDecision.id} recorded successfully.`
      );

      setShowOutcomeForm(false);
      setSelectedDecision(null);

      setActualCost("");
      setActualDays("");
      setActualRisk("Low");
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Unable to record the execution outcome."
      );
    } finally {
      setSavingOutcome(false);
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
      await API.delete(`/executed-decisions/${decisionId}`);

      setDecisions((current) =>
        current.filter(
          (decision) => decision.id !== decisionId
        )
      );

      setOutcomes((current) =>
        current.filter(
          (outcome) =>
            Number(outcome.executed_decision_id) !==
            Number(decisionId)
        )
      );

      setSuccess(
        `Execution #${decisionId} deleted successfully.`
      );

      setError("");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to delete the executed decision."
      );
    }
  };

  const formatCurrency = (value) => {
    return `$${Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getRiskClass = (risk) => {
    return `risk-${String(risk || "")
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  };

  const getOutcomeClass = (status) => {
    if (!status) {
      return "outcome-pending";
    }

    if (
      String(status).toLowerCase().includes("variance")
    ) {
      return "outcome-variance";
    }

    if (
      String(status).toLowerCase().includes("success")
    ) {
      return "outcome-success";
    }

    return "outcome-pending";
  };

  return (
    <div className="executed-page">

      {/* HEADER */}
      <div className="executed-header">
        <div>
          <p className="executed-eyebrow">
            EXECUTION INTELLIGENCE
          </p>

          <h1>Executed Decisions</h1>

          <p className="executed-description">
            Review supply-chain actions that have been
            selected and executed through the optimization
            engine.
          </p>
        </div>

        <button
          className="executed-refresh-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* MESSAGES */}
      {error && (
        <div className="executed-error">
          {error}
        </div>
      )}

      {success && (
        <div className="executed-success">
          {success}
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

        <div className="execution-stat-card">
          <span className="execution-stat-label">
            VARIANCES DETECTED
          </span>

          <strong className="execution-stat-value">
            {
              outcomes.filter((item) =>
                String(item.outcome_status || "")
                  .toLowerCase()
                  .includes("variance")
              ).length
            }
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
            <h3>
              Loading execution records...
            </h3>

            <p>
              Retrieving executed supply-chain decisions.
            </p>
          </div>
        ) : decisions.length === 0 ? (
          <div className="execution-empty">
            <h3>
              No executed decisions yet
            </h3>

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
                  <th>Outcome</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {decisions.map((decision) => {

                  const outcome =
                    getOutcomeForDecision(decision.id);

                  return (
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
                          className={`risk-badge ${getRiskClass(
                            decision.risk
                          )}`}
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
                          className={`risk-badge ${getRiskClass(
                            decision.expected_risk
                          )}`}
                        >
                          {decision.expected_risk}
                        </span>
                      </td>

                      <td>
                        {decision.executed_at}
                      </td>

                      <td>
                        {outcome ? (
                          <span
                            className={`outcome-badge ${getOutcomeClass(
                              outcome.outcome_status
                            )}`}
                          >
                            {outcome.outcome_status}
                          </span>
                        ) : (
                          <span className="outcome-badge outcome-pending">
                            Not Recorded
                          </span>
                        )}
                      </td>

                      <td className="execution-actions">

                        {!outcome && (
                          <button
                            className="record-outcome-button"
                            onClick={() =>
                              openOutcomeForm(decision)
                            }
                          >
                            Record Outcome
                          </button>
                        )}

                        <button
                          className="delete-execution-button"
                          onClick={() =>
                            deleteDecision(decision.id)
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

      {/* RECORD OUTCOME FORM */}
      {showOutcomeForm && selectedDecision && (
        <div className="outcome-modal-overlay">

          <div className="outcome-modal">

            <div className="outcome-modal-header">

              <div>
                <p className="executed-eyebrow">
                  EXECUTION OUTCOME
                </p>

                <h2>
                  Record Outcome
                </h2>

                <p>
                  Decision #{selectedDecision.id} —{" "}
                  {selectedDecision.action}
                </p>
              </div>

              <button
                className="modal-close-button"
                onClick={closeOutcomeForm}
                disabled={savingOutcome}
              >
                ×
              </button>

            </div>

            <div className="outcome-decision-summary">

              <div>
                <span>SUPPLIER</span>
                <strong>
                  {selectedDecision.supplier}
                </strong>
              </div>

              <div>
                <span>QUANTITY</span>
                <strong>
                  {selectedDecision.quantity}
                </strong>
              </div>

              <div>
                <span>EXPECTED COST</span>
                <strong>
                  {formatCurrency(
                    selectedDecision.expected_cost
                  )}
                </strong>
              </div>

              <div>
                <span>EXPECTED DELIVERY</span>
                <strong>
                  {selectedDecision.expected_days} days
                </strong>
              </div>

            </div>

            <form
              className="outcome-form"
              onSubmit={handleRecordOutcome}
            >

              <div className="outcome-form-group">

                <label>
                  Actual Cost
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter actual cost"
                  value={actualCost}
                  onChange={(e) =>
                    setActualCost(e.target.value)
                  }
                  required
                />

              </div>

              <div className="outcome-form-group">

                <label>
                  Actual Delivery Days
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter actual delivery days"
                  value={actualDays}
                  onChange={(e) =>
                    setActualDays(e.target.value)
                  }
                  required
                />

              </div>

              <div className="outcome-form-group">

                <label>
                  Actual Risk
                </label>

                <select
                  value={actualRisk}
                  onChange={(e) =>
                    setActualRisk(e.target.value)
                  }
                >
                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>
                </select>

              </div>

              <div className="outcome-form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeOutcomeForm}
                  disabled={savingOutcome}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="record-outcome-submit"
                  disabled={savingOutcome}
                >
                  {savingOutcome
                    ? "Recording..."
                    : "Record Outcome"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* OUTCOMES */}
      <section className="outcomes-section">

        <div className="execution-section-header">

          <div>
            <p className="executed-eyebrow">
              EXECUTION OUTCOMES
            </p>

            <h2>
              Expected vs Actual Performance
            </h2>

            <p>
              Compare the planned supply-chain decision
              with the actual execution result.
            </p>
          </div>

        </div>

        {outcomes.length === 0 ? (
          <div className="empty-state">
            <h3>
              No execution outcomes recorded
            </h3>

            <p>
              Record an outcome from an executed decision
              to see the comparison here.
            </p>
          </div>
        ) : (
          <div className="outcome-grid">

            {outcomes.map((outcome) => (

              <div
                className="outcome-card"
                key={outcome.id}
              >

                <div className="outcome-card-header">

                  <div>
                    <span>
                      OUTCOME #{outcome.id}
                    </span>

                    <h3>
                      {outcome.action}
                    </h3>
                  </div>

                  <span
                    className={`outcome-badge ${getOutcomeClass(
                      outcome.outcome_status
                    )}`}
                  >
                    {outcome.outcome_status}
                  </span>

                </div>

                <div className="outcome-info">

                  <div>
                    <span>Supplier</span>
                    <strong>
                      {outcome.supplier}
                    </strong>
                  </div>

                  <div>
                    <span>Quantity</span>
                    <strong>
                      {outcome.quantity}
                    </strong>
                  </div>

                  <div>
                    <span>Action ID</span>
                    <strong>
                      {outcome.action_id}
                    </strong>
                  </div>

                </div>

                <div className="comparison-grid">

                  <div className="comparison-column">

                    <h4>
                      Expected
                    </h4>

                    <p>
                      Cost
                      <strong>
                        {formatCurrency(
                          outcome.expected_cost
                        )}
                      </strong>
                    </p>

                    <p>
                      Delivery
                      <strong>
                        {outcome.expected_days} days
                      </strong>
                    </p>

                    <p>
                      Risk
                      <strong>
                        {outcome.expected_risk}
                      </strong>
                    </p>

                  </div>

                  <div className="comparison-column">

                    <h4>
                      Actual
                    </h4>

                    <p>
                      Cost
                      <strong>
                        {formatCurrency(
                          outcome.actual_cost
                        )}
                      </strong>
                    </p>

                    <p>
                      Delivery
                      <strong>
                        {outcome.actual_days} days
                      </strong>
                    </p>

                    <p>
                      Risk
                      <strong>
                        {outcome.actual_risk}
                      </strong>
                    </p>

                  </div>

                </div>

                <div className="variance-summary">

                  <div>
                    <span>
                      Cost Variance
                    </span>

                    <strong>
                      {outcome.cost_variance >= 0
                        ? "+"
                        : ""}
                      {formatCurrency(
                        outcome.cost_variance
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Delivery Variance
                    </span>

                    <strong>
                      {outcome.delivery_variance >= 0
                        ? "+"
                        : ""}
                      {outcome.delivery_variance} days
                    </strong>
                  </div>

                </div>

                <p className="recorded-time">
                  Recorded: {outcome.recorded_at}
                </p>

              </div>

            ))}

          </div>
        )}

      </section>

    </div>
  );
}

export default ExecutedDecisions;