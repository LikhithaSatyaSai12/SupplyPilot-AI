import { useEffect, useState } from "react";
import axios from "axios";

function Prescriptions() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/suppliers`);
      setSuppliers(response.data);

      if (response.data.length > 0) {
        setSupplier(response.data[0]);
      }
    } catch (err) {
      setError("Unable to connect to the SupplyPilot-AI backend.");
    }
  };

  const generatePrescriptions = async () => {
    setError("");
    setResult(null);

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
      const response = await axios.post(
        `${API_URL}/prescriptions`,
        {
          supplier: supplier,
          quantity: Number(quantity),
        }
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="eyebrow">OPTIMIZATION INTELLIGENCE</p>

          <h1>Supplier Prescriptions</h1>

          <p className="page-description">
            Generate optimized actions to reduce supplier risk, delivery
            delays, and emergency costs.
          </p>
        </div>
      </div>

      <section className="assessment-card">
        <div className="section-heading">
          <p className="eyebrow">RUN OPTIMIZATION</p>

          <h2>Generate Supplier Prescription</h2>

          <p>
            Select a supplier and enter the expected order quantity to
            generate optimized supply-chain actions.
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

        <button
          className="primary-button"
          onClick={generatePrescriptions}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Prescriptions"}
        </button>
      </section>

      {result && (
        <section className="results-section">
          <div className="section-heading">
            <p className="eyebrow">OPTIMIZATION COMPLETE</p>

            <h2>Recommended Supply-Chain Actions</h2>

            <p>
              The optimization engine evaluated multiple alternatives for
              this supplier and order.
            </p>
          </div>

          <div className="result-summary">
            <div>
              <span>SUPPLIER</span>
              <strong>{result.supplier}</strong>
            </div>

            <div>
              <span>ORDER QUANTITY</span>
              <strong>{result.quantity}</strong>
            </div>

            <div>
              <span>RISK LEVEL</span>
              <strong>{result.risk}</strong>
            </div>
          </div>

          <div className="prescription-grid">
            {result.prescriptions?.map((item) => (
              <div
                key={item.id}
                className={`prescription-card ${
                  item.optimal ? "optimal-card" : ""
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

                <h3>{item.action}</h3>

                <p className="prescription-description">
                  {item.description}
                </p>

                <div className="prescription-details">
                  <div>
                    <span>Cost</span>
                    <strong>
                      ₹{Number(item.cost).toLocaleString()}
                    </strong>
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
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="how-it-works">
        <p className="eyebrow">HOW IT WORKS</p>

        <h2>Optimization-assisted decision support</h2>

        <div className="steps-grid">
          <div className="step-card">
            <span>01</span>

            <h3>Risk evaluation</h3>

            <p>
              The supplier risk level is considered before generating
              actions.
            </p>
          </div>

          <div className="step-card">
            <span>02</span>

            <h3>Action alternatives</h3>

            <p>
              Multiple supply-chain responses are evaluated, including
              freight, secondary sourcing, and delay.
            </p>
          </div>

          <div className="step-card">
            <span>03</span>

            <h3>Optimal recommendation</h3>

            <p>
              The optimization engine identifies the most suitable action
              based on the decision model.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Prescriptions;