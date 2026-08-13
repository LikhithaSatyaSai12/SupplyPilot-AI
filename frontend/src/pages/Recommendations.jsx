import { useEffect, useState } from "react";
import API from "../services/api";

function Recommendations() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);

      const response = await API.get("/suppliers");

      setSuppliers(response.data);
    } catch (error) {
      console.error(error);

      setError(
        "Could not load suppliers. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleRecommendation = async (e) => {
    e.preventDefault();

    setError("");
    setResult(null);

    if (!supplier || !quantity) {
      setError("Please select a supplier and enter quantity.");
      return;
    }

    if (Number(quantity) <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/recommendations", {
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
      <h1>Recommendations</h1>

      <form onSubmit={handleRecommendation}>
        <div>
          <label>Supplier</label>
          <br />

          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            disabled={loadingSuppliers}
          >
            <option value="">
              {loadingSuppliers
                ? "Loading suppliers..."
                : "Select a supplier"}
            </option>

            {suppliers.map((supplierName) => (
              <option key={supplierName} value={supplierName}>
                {supplierName}
              </option>
            ))}
          </select>
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
            min="1"
          />
        </div>

        <br />

        <button type="submit" disabled={loading || loadingSuppliers}>
          {loading
            ? "Getting Recommendation..."
            : "Get Recommendation"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: "30px" }}>
          <h2>Recommendation Result</h2>

          <p>
            <strong>Supplier:</strong> {result.supplier}
          </p>

          <p>
            <strong>Quantity:</strong> {result.quantity}
          </p>

          <p>
            <strong>Risk:</strong> {result.risk}
          </p>

          <p>
            <strong>Recommendation:</strong> {result.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

export default Recommendations;