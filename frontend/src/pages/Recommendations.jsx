import { useEffect, useState } from "react";

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
            supplier: supplier,
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

  return (
    <div style={{ padding: "40px", maxWidth: "900px" }}>
      <h1>Supplier Recommendations</h1>

      <p>
        Get an AI-powered supplier risk assessment and recommendation.
      </p>

      <form onSubmit={handleRecommendation}>
        <div style={{ marginTop: "25px" }}>
          <label>
            <strong>Supplier</strong>
          </label>

          <br />

          <select
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
            style={{
              marginTop: "8px",
              padding: "10px",
              width: "100%",
              maxWidth: "600px",
            }}
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

        <div style={{ marginTop: "20px" }}>
          <label>
            <strong>Order Quantity</strong>
          </label>

          <br />

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            style={{
              marginTop: "8px",
              padding: "10px",
              width: "100%",
              maxWidth: "600px",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "25px",
            padding: "12px 24px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "7px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "Getting Recommendation..."
            : "Get Recommendation"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "8px",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: "30px",
            padding: "25px",
            background: "white",
            border: "1px solid #d9e2ec",
            borderRadius: "12px",
          }}
        >
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
            <strong>Recommendation:</strong>
          </p>

          <p>{result.recommendation}</p>
        </div>
      )}
    </div>
  );
}

export default Recommendations;