import { useEffect, useState } from "react";
import "./Recommendations.css";

function Recommendations() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState(250);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/suppliers")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load suppliers");
        }

        return response.json();
      })
      .then((data) => {
        setSuppliers(data);

        if (data.length > 0) {
          setSupplier(data[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load suppliers from backend.");
      });
  }, []);

  const handleRecommendation = async (event) => {
    event.preventDefault();

    setError("");
    setResult(null);

    if (!supplier || !quantity) {
      setError("Please select a supplier and enter quantity.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://127.0.0.1:8000/recommendations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier,
            quantity: Number(quantity),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Recommendation request failed");
      }

      const data = await response.json();

      setResult(data);
    } catch (err) {
      console.error(err);

      setError(
        "Could not generate recommendation. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskClass = (risk) => {
    if (risk === "High") return "risk-high";
    if (risk === "Medium") return "risk-medium";
    return "risk-low";
  };

  return (
    <div className="recommendation-page">
      <div className="recommendation-header">
        <div>
          <span className="page-eyebrow">SUPPLIER INTELLIGENCE</span>

          <h1>Supplier Recommendations</h1>

          <p>
            Evaluate supplier risk and receive an actionable recommendation
            before placing an order.
          </p>
        </div>
      </div>

      <div className="recommendation-layout">
        <div className="recommendation-form-card">
          <div className="card-heading">
            <h2>Run Assessment</h2>

            <p>
              Select a supplier and enter the expected order quantity.
            </p>
          </div>

          <form onSubmit={handleRecommendation}>
            <div className="recommendation-field">
              <label htmlFor="supplier">Supplier</label>

              <select
                id="supplier"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
              >
                {suppliers.length === 0 ? (
                  <option value="">Loading suppliers...</option>
                ) : (
                  suppliers.map((item, index) => (
                    <option key={index} value={item}>
                      {item}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="recommendation-field">
              <label htmlFor="quantity">Order Quantity</label>

              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>

            {error && (
              <div className="recommendation-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="recommendation-button"
              disabled={loading}
            >
              {loading
                ? "Analyzing Supplier..."
                : "Get Recommendation"}
            </button>
          </form>
        </div>

        <div className="recommendation-info-card">
          <span className="info-label">WHAT YOU GET</span>

          <h2>AI-assisted supplier decision support</h2>

          <p>
            SupplyPilot-AI evaluates supplier information and order quantity
            to estimate risk and provide a practical next step.
          </p>

          <div className="info-points">
            <div>
              <span>01</span>
              <p>Supplier risk assessment</p>
            </div>

            <div>
              <span>02</span>
              <p>Order-specific evaluation</p>
            </div>

            <div>
              <span>03</span>
              <p>Actionable recommendation</p>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="recommendation-result-card">
          <div className="result-top">
            <div>
              <span className="page-eyebrow">ASSESSMENT COMPLETE</span>

              <h2>Recommendation Result</h2>
            </div>

            <span className={`risk-badge ${getRiskClass(result.risk)}`}>
              {result.risk} Risk
            </span>
          </div>

          <div className="result-details">
            <div className="result-detail">
              <span>SUPPLIER</span>
              <strong>{result.supplier}</strong>
            </div>

            <div className="result-detail">
              <span>ORDER QUANTITY</span>
              <strong>{result.quantity}</strong>
            </div>

            <div className="result-detail">
              <span>RISK LEVEL</span>
              <strong>{result.risk}</strong>
            </div>
          </div>

          <div className="recommendation-message">
            <span>RECOMMENDED ACTION</span>

            <p>{result.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recommendations;