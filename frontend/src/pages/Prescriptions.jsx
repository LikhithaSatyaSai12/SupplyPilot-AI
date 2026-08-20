import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  getSuppliers,
  generatePrescriptions,
  executePrescription,
} from "../services/api";

import "./Prescriptions.css";

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function TradeoffTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="tradeoff-tooltip-card">
        <div className="tooltip-header">
          <strong>Option {data.id}: {data.action}</strong>
          {data.optimal && (
            <span className="tooltip-optimal-badge">OPTIMAL</span>
          )}
        </div>
        <div className="tooltip-body">
          <p>
            <span>Cost:</span>
            <strong>{formatCurrency(data.cost)}</strong>
          </p>
          <p>
            <span>Delivery Time:</span>
            <strong>{data.days} days</strong>
          </p>
          <p>
            <span>Risk Level:</span>
            <strong>{data.risk}</strong>
          </p>
          <p>
            <span>Feasibility:</span>
            <strong style={{ color: data.feasible ? "#16a34a" : "#dc2626" }}>
              {data.feasible ? "Feasible" : "Infeasible"}
            </strong>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

function Prescriptions() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const [executedAction, setExecutedAction] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await getSuppliers();
      setSuppliers(response.data);

      if (response.data.length > 0) {
        setSupplier(response.data[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the SupplyPilot-AI backend.");
    }
  };

  const handleGenerate = async () => {
    setError("");
    setSuccess("");
    setResult(null);
    setExecutedAction(null);

    if (!supplier) {
      setError("Please select a supplier.");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter a valid order quantity.");
      return;
    }

    setLoading(true);

    try {
      const response = await generatePrescriptions(supplier, quantity);
      setResult(response.data);
    } catch (err) {
      console.error(err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(
          "Unable to generate supplier prescriptions. Please make sure the backend is running."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (item) => {
    setError("");
    setSuccess("");

    if (!result) {
      return;
    }

    setExecuting(true);

    try {
      const response = await executePrescription({
        supplier: result.supplier,
        quantity: Number(result.quantity),
        risk: result.risk,

        action_id: item.id,
        action: item.action,
        description: item.description,

        expected_cost: Number(item.cost),
        expected_days: Number(item.days),
        expected_risk: item.risk,
      });

      setExecutedAction(response.data);
      setSuccess(
        "The selected supply-chain action has been executed and recorded successfully."
      );
    } catch (err) {
      console.error(err);

      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(
          "Unable to execute the selected decision. Please make sure the backend is running."
        );
      }
    } finally {
      setExecuting(false);
    }
  };

  const chartData = useMemo(() => {
    if (!result?.prescriptions) return [];
    return result.prescriptions.map((item) => ({
      id: item.id,
      action: item.action,
      cost: Number(item.cost || 0),
      days: Number(item.days || 0),
      risk: item.risk,
      optimal: Boolean(item.optimal),
      feasible: Boolean(item.feasible),
      description: item.description,
    }));
  }, [result]);

  return (
    <div className="page-container">
      {/* ------------------------------------------------ */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------ */}
      <div className="page-header">
        <div>
          <p className="eyebrow">OPTIMIZATION INTELLIGENCE</p>
          <h1>Supplier Prescriptions</h1>
          <p className="page-description">
            Generate optimized actions to reduce supplier risk, delivery delays,
            and emergency costs.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* ASSESSMENT FORM */}
      {/* ------------------------------------------------ */}
      <section className="assessment-card">
        <div className="section-heading">
          <p className="eyebrow">RUN OPTIMIZATION</p>
          <h2>Generate Supplier Prescription</h2>
          <p>
            Select a supplier and enter the expected order quantity to generate
            optimized supply-chain actions.
          </p>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Supplier</label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            >
              {suppliers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Order Quantity</label>
            <input
              type="number"
              min="1"
              placeholder="Enter the expected number of units"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          className="primary-button"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Prescriptions"}
        </button>
      </section>

      {/* ------------------------------------------------ */}
      {/* RESULTS */}
      {/* ------------------------------------------------ */}
      {result && (
        <section className="results-section">
          <div className="section-heading">
            <p className="eyebrow">OPTIMIZATION COMPLETE</p>
            <h2>Recommended Supply-Chain Actions</h2>
            <p>
              The optimization engine evaluated multiple alternatives for this
              supplier and order.
            </p>
          </div>

          {/* SUMMARY */}
          <div className="result-summary">
            <div>
              <span>SUPPLIER</span>
              <strong>{result.supplier}</strong>
            </div>

            <div>
              <span>ORDER QUANTITY</span>
              <strong>{result.quantity} units</strong>
            </div>

            <div>
              <span>PREDICTED RISK</span>
              <strong>{result.risk}</strong>
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* COST VS SPEED TRADE-OFF CHART */}
          {/* ------------------------------------------------ */}
          {chartData.length > 0 && (
            <div className="tradeoff-chart-card">
              <div className="tradeoff-chart-header">
                <p className="eyebrow">TRADE-OFF ANALYSIS</p>
                <h3>Cost vs. Speed Trade-Off Frontier</h3>
                <p>
                  Visualizes the direct trade-off between expedited delivery
                  speed (X-axis) and financial expenditure (Y-axis) for each
                  prescribed option.
                </p>
              </div>

              <div className="tradeoff-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="days"
                      name="Delivery Time"
                      unit="d"
                      domain={["auto", "auto"]}
                      label={{
                        value: "Delivery Duration (Days)",
                        position: "insideBottom",
                        offset: -10,
                        fill: "#64748b",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="cost"
                      name="Estimated Cost"
                      unit="$"
                      domain={[0, "auto"]}
                      tickFormatter={(val) => `$${Number(val).toLocaleString()}`}
                      label={{
                        value: "Estimated Cost (USD)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#64748b",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />
                    <ZAxis type="number" range={[200, 300]} />
                    <Tooltip content={<TradeoffTooltip />} />
                    <Scatter name="Prescriptions" data={chartData}>
                      {chartData.map((entry) => (
                        <Cell
                          key={`cell-${entry.id}`}
                          fill={
                            entry.optimal
                              ? "#16a34a"
                              : !entry.feasible
                              ? "#dc2626"
                              : "#2563eb"
                          }
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="tradeoff-legend">
                <div className="legend-item">
                  <span className="legend-dot optimal"></span>
                  <span>Optimal Recommendation</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot alternative"></span>
                  <span>Feasible Alternative</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot infeasible"></span>
                  <span>Infeasible Constraint Violation</span>
                </div>
              </div>
            </div>
          )}

          {/* PRESCRIPTION CARDS */}
          <div className="prescription-grid">
            {result.prescriptions?.map((item) => (
              <div
                key={item.id}
                className={`prescription-card ${
                  item.optimal ? "optimal-card" : ""
                }`}
              >
                {item.optimal && (
                  <div className="optimal-badge">OPTIMAL RECOMMENDATION</div>
                )}

                <div className="prescription-number">{item.id}</div>

                <h3>{item.action}</h3>

                <p className="prescription-description">{item.description}</p>

                {/* DETAILS */}
                <div className="prescription-details">
                  <div>
                    <span>Cost</span>
                    <strong>{formatCurrency(item.cost)}</strong>
                  </div>

                  <div>
                    <span>Delivery</span>
                    <strong>{item.days} days</strong>
                  </div>

                  <div>
                    <span>Risk</span>
                    <strong>{item.risk}</strong>
                  </div>
                </div>

                {/* EXECUTE BUTTON */}
                <button
                  className={
                    item.optimal
                      ? "primary-button execute-button"
                      : "secondary-button execute-button"
                  }
                  onClick={() => handleExecute(item)}
                  disabled={executing}
                >
                  {executing
                    ? "Executing..."
                    : item.optimal
                    ? "Execute Decision"
                    : "Select This Action"}
                </button>
              </div>
            ))}
          </div>

          {/* ------------------------------------------------ */}
          {/* EXECUTED RESULT */}
          {/* ------------------------------------------------ */}
          {executedAction && (
            <div className="execution-result">
              <p className="eyebrow">DECISION EXECUTED</p>
              <h2>Supply-chain action recorded</h2>

              <div className="execution-summary">
                <div>
                  <span>EXECUTION ID</span>
                  <strong>#{executedAction.id}</strong>
                </div>

                <div>
                  <span>ACTION</span>
                  <strong>{executedAction.action}</strong>
                </div>

                <div>
                  <span>COST</span>
                  <strong>
                    {formatCurrency(executedAction.expected_cost)}
                  </strong>
                </div>

                <div>
                  <span>DELIVERY</span>
                  <strong>{executedAction.expected_days} days</strong>
                </div>

                <div>
                  <span>RISK</span>
                  <strong>{executedAction.expected_risk}</strong>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------ */}
      {/* HOW IT WORKS */}
      {/* ------------------------------------------------ */}
      <section className="how-it-works">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2>Optimization-assisted decision support</h2>

        <div className="steps-grid">
          <div className="step-card">
            <span>01</span>
            <h3>Risk evaluation</h3>
            <p>
              The supplier risk level is considered before generating actions.
            </p>
          </div>

          <div className="step-card">
            <span>02</span>
            <h3>Action alternatives</h3>
            <p>
              Multiple supply-chain responses are evaluated, including freight,
              secondary sourcing, and delay.
            </p>
          </div>

          <div className="step-card">
            <span>03</span>
            <h3>Optimal recommendation</h3>
            <p>
              The optimization engine identifies the most suitable action based
              on the decision model.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Prescriptions;