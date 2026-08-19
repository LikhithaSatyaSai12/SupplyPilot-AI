import { useEffect, useState } from "react";
import {
  getSuppliers,
  generatePrescriptions,
  executePrescription,
} from "../services/api";

import "./Prescriptions.css";

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

      setError(
        "Unable to connect to the SupplyPilot-AI backend."
      );
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
      const response = await generatePrescriptions(
        supplier,
        quantity
      );

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

  return (
    <div className="page-container">

      {/* ------------------------------------------------ */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------ */}

      <div className="page-header">
        <div>
          <p className="eyebrow">
            OPTIMIZATION INTELLIGENCE
          </p>

          <h1>Supplier Prescriptions</h1>

          <p className="page-description">
            Generate optimized actions to reduce supplier risk,
            delivery delays, and emergency costs.
          </p>
        </div>
      </div>


      {/* ------------------------------------------------ */}
      {/* ASSESSMENT FORM */}
      {/* ------------------------------------------------ */}

      <section className="assessment-card">

        <div className="section-heading">

          <p className="eyebrow">
            RUN OPTIMIZATION
          </p>

          <h2>
            Generate Supplier Prescription
          </h2>

          <p>
            Select a supplier and enter the expected order
            quantity to generate optimized supply-chain actions.
          </p>

        </div>


        <div className="form-grid">

          <div className="form-group">

            <label>
              Supplier
            </label>

            <select
              value={supplier}
              onChange={(e) =>
                setSupplier(e.target.value)
              }
            >
              {suppliers.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

          </div>


          <div className="form-group">

            <label>
              Order Quantity
            </label>

            <input
              type="number"
              min="1"
              placeholder="Enter the expected number of units"
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value)
              }
            />

          </div>

        </div>


        {/* ERROR */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}


        {/* SUCCESS */}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}


        <button
          className="primary-button"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading
            ? "Generating..."
            : "Generate Prescriptions"}
        </button>

      </section>


      {/* ------------------------------------------------ */}
      {/* RESULTS */}
      {/* ------------------------------------------------ */}

      {result && (

        <section className="results-section">

          <div className="section-heading">

            <p className="eyebrow">
              OPTIMIZATION COMPLETE
            </p>

            <h2>
              Recommended Supply-Chain Actions
            </h2>

            <p>
              The optimization engine evaluated multiple
              alternatives for this supplier and order.
            </p>

          </div>


          {/* SUMMARY */}

          <div className="result-summary">

            <div>
              <span>
                SUPPLIER
              </span>

              <strong>
                {result.supplier}
              </strong>
            </div>


            <div>
              <span>
                ORDER QUANTITY
              </span>

              <strong>
                {result.quantity}
              </strong>
            </div>


            <div>
              <span>
                RISK LEVEL
              </span>

              <strong>
                {result.risk}
              </strong>
            </div>

          </div>


          {/* PRESCRIPTION CARDS */}

          <div className="prescription-grid">

            {result.prescriptions?.map((item) => (

              <div
                key={item.id}
                className={`prescription-card ${
                  item.optimal
                    ? "optimal-card"
                    : ""
                }`}
              >

                {item.optimal && (
                  <div className="optimal-badge">
                    OPTIMAL RECOMMENDATION
                  </div>
                )}


                <div className="prescription-number">
                  {item.id}
                </div>


                <h3>
                  {item.action}
                </h3>


                <p className="prescription-description">
                  {item.description}
                </p>


                {/* DETAILS */}

                <div className="prescription-details">

                  <div>

                    <span>
                      Cost
                    </span>

                    <strong>
                      ₹
                      {Number(
                        item.cost
                      ).toLocaleString("en-IN")}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Delivery
                    </span>

                    <strong>
                      {item.days} days
                    </strong>

                  </div>


                  <div>

                    <span>
                      Risk
                    </span>

                    <strong>
                      {item.risk}
                    </strong>

                  </div>

                </div>


                {/* EXECUTE BUTTON */}

                <button
                  className={
                    item.optimal
                      ? "primary-button execute-button"
                      : "secondary-button execute-button"
                  }
                  onClick={() =>
                    handleExecute(item)
                  }
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

              <p className="eyebrow">
                DECISION EXECUTED
              </p>

              <h2>
                Supply-chain action recorded
              </h2>

              <div className="execution-summary">

                <div>
                  <span>
                    EXECUTION ID
                  </span>

                  <strong>
                    #{executedAction.id}
                  </strong>
                </div>


                <div>
                  <span>
                    ACTION
                  </span>

                  <strong>
                    {executedAction.action}
                  </strong>
                </div>


                <div>
                  <span>
                    COST
                  </span>

                  <strong>
                    ₹
                    {Number(
                      executedAction.expected_cost
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>


                <div>
                  <span>
                    DELIVERY
                  </span>

                  <strong>
                    {executedAction.expected_days} days
                  </strong>
                </div>


                <div>
                  <span>
                    RISK
                  </span>

                  <strong>
                    {executedAction.expected_risk}
                  </strong>
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

        <p className="eyebrow">
          HOW IT WORKS
        </p>

        <h2>
          Optimization-assisted decision support
        </h2>


        <div className="steps-grid">

          <div className="step-card">

            <span>
              01
            </span>

            <h3>
              Risk evaluation
            </h3>

            <p>
              The supplier risk level is considered
              before generating actions.
            </p>

          </div>


          <div className="step-card">

            <span>
              02
            </span>

            <h3>
              Action alternatives
            </h3>

            <p>
              Multiple supply-chain responses are
              evaluated, including freight,
              secondary sourcing, and delay.
            </p>

          </div>


          <div className="step-card">

            <span>
              03
            </span>

            <h3>
              Optimal recommendation
            </h3>

            <p>
              The optimization engine identifies
              the most suitable action based on
              the decision model.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Prescriptions;