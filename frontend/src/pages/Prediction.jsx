import { useEffect, useState } from "react";
import API from "../services/api";
import "./Prediction.css";

function Prediction() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState(250);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      setError("");

      const response = await API.get("/suppliers");

      setSuppliers(response.data);

      if (response.data.length > 0) {
        setSupplier(response.data[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load suppliers.");
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handlePrediction = async (event) => {
    event.preventDefault();

    if (!supplier) {
      setError("Please select a supplier.");
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter a valid order quantity.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response = await API.post("/predict", {
        supplier: supplier,
        quantity: Number(quantity),
      });

      setResult(response.data);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to generate supplier risk prediction."
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskClass = (risk) => {
    if (!risk) return "";

    return `prediction-risk-${String(risk).toLowerCase()}`;
  };

  return (
    <div className="prediction-page">

      {/* PAGE HEADER */}

      <div className="prediction-header">

        <div>

          <span className="prediction-eyebrow">
            RISK INTELLIGENCE
          </span>

          <h1>
            Supplier Risk Prediction
          </h1>

          <p>
            Evaluate supplier risk before placing an order
            using supplier information and expected quantity.
          </p>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="prediction-error">
          {error}
        </div>
      )}


      {/* MAIN CONTENT */}

      <div className="prediction-layout">

        {/* FORM */}

        <div className="prediction-card">

          <div className="prediction-card-header">

            <div>

              <span className="prediction-section-label">
                RUN ASSESSMENT
              </span>

              <h2>
                Supplier Evaluation
              </h2>

              <p>
                Select a supplier and enter the expected
                order quantity.
              </p>

            </div>

          </div>


          <form
            className="prediction-form"
            onSubmit={handlePrediction}
          >

            <div className="prediction-form-group">

              <label htmlFor="supplier">
                Supplier
              </label>

              <select
                id="supplier"
                value={supplier}
                onChange={(event) =>
                  setSupplier(event.target.value)
                }
                disabled={loadingSuppliers || loading}
              >

                {loadingSuppliers ? (
                  <option>
                    Loading suppliers...
                  </option>
                ) : suppliers.length === 0 ? (
                  <option>
                    No suppliers available
                  </option>
                ) : (
                  suppliers.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))
                )}

              </select>

            </div>


            <div className="prediction-form-group">

              <label htmlFor="quantity">
                Order Quantity
              </label>

              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(event.target.value)
                }
                disabled={loading}
              />

              <small>
                Enter the expected number of units for this order.
              </small>

            </div>


            <button
              className="prediction-submit"
              type="submit"
              disabled={
                loading ||
                loadingSuppliers ||
                suppliers.length === 0
              }
            >

              {loading
                ? "Analyzing Supplier..."
                : "Predict Risk"}

            </button>

          </form>

        </div>


        {/* INFORMATION */}

        <div className="prediction-info-card">

          <span className="prediction-section-label">
            HOW IT WORKS
          </span>

          <h2>
            AI-assisted risk assessment
          </h2>

          <p>
            SupplyPilot-AI evaluates supplier information
            together with the requested order quantity to
            estimate the potential supply risk.
          </p>


          <div className="prediction-info-item">

            <div className="prediction-info-number">
              01
            </div>

            <div>
              <strong>
                Supplier analysis
              </strong>

              <span>
                Supplier performance information is evaluated.
              </span>
            </div>

          </div>


          <div className="prediction-info-item">

            <div className="prediction-info-number">
              02
            </div>

            <div>
              <strong>
                Order evaluation
              </strong>

              <span>
                The requested quantity is included in the assessment.
              </span>
            </div>

          </div>


          <div className="prediction-info-item">

            <div className="prediction-info-number">
              03
            </div>

            <div>
              <strong>
                Risk classification
              </strong>

              <span>
                The model returns a High, Medium, or Low risk level.
              </span>
            </div>

          </div>

        </div>

      </div>


      {/* RESULT */}

      {result && (

        <div className="prediction-result">

          <div className="prediction-result-header">

            <div>

              <span className="prediction-section-label">
                ASSESSMENT COMPLETE
              </span>

              <h2>
                Prediction Result
              </h2>

            </div>

            <span
              className={`prediction-risk-badge ${getRiskClass(
                result.risk
              )}`}
            >
              {result.risk} Risk
            </span>

          </div>


          <div className="prediction-result-grid">

            <div className="prediction-result-item">

              <span>
                Supplier
              </span>

              <strong>
                {result.supplier}
              </strong>

            </div>


            <div className="prediction-result-item">

              <span>
                Order Quantity
              </span>

              <strong>
                {result.quantity}
              </strong>

            </div>


            <div className="prediction-result-item">

              <span>
                Risk Level
              </span>

              <strong>
                {result.risk}
              </strong>

            </div>


            {result.predicted_delay_days !== undefined && (

              <div className="prediction-result-item">

                <span>
                  Predicted Delay
                </span>

                <strong>
                  {result.predicted_delay_days} days
                </strong>

              </div>

            )}


            {result.disruption_probability !== undefined && (

              <div className="prediction-result-item">

                <span>
                  Disruption Probability
                </span>

                <strong>
                  {result.disruption_probability}%
                </strong>

              </div>

            )}

          </div>


          <div className="prediction-result-footer">

            <p>
              This assessment has been recorded in
              Decision History.
            </p>

          </div>

        </div>

      )}

    </div>
  );
}

export default Prediction;