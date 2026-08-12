import { useState } from "react";
import API from "../services/api";

function Prediction() {
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePredict = async (e) => {
    e.preventDefault();

    setError("");
    setResult(null);

    if (!supplier || !quantity) {
      setError("Please enter supplier and quantity.");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/predict", {
        supplier: supplier,
        quantity: Number(quantity),
      });

      setResult(response.data);
    } catch (error) {
      console.error(error);

      setError(
        "Backend connection failed. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Prediction</h1>

      <form onSubmit={handlePredict}>
        <div>
          <label>Supplier</label>
          <br />
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Enter supplier name"
          />
        </div>

        <br />

        <div>
          <label>Quantity</label>
          <br />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? "Predicting..." : "Predict Risk"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: "30px" }}>
          <h2>Prediction Result</h2>

          <p>
            <strong>Supplier:</strong> {result.supplier}
          </p>

          <p>
            <strong>Quantity:</strong> {result.quantity}
          </p>

          <p>
            <strong>Risk:</strong> {result.risk}
          </p>
        </div>
      )}
    </div>
  );
}

export default Prediction;