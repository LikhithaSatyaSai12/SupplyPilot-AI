import { useEffect, useState } from "react";
import API from "../services/api";

function DecisionHistory() {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/history");

      setHistory(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load decision history.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this decision?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");

      await API.delete(`/history/${id}`);

      setHistory((currentHistory) =>
        currentHistory.filter((item) => item.id !== id)
      );
    } catch (err) {
      console.error(err);
      setError("Could not delete this decision.");
    } finally {
      setDeletingId(null);
    }
  };

  const getRiskColor = (risk) => {
    if (risk === "High") {
      return "red";
    }

    if (risk === "Medium") {
      return "orange";
    }

    return "green";
  };

  return (
    <div>
      <h1>Decision History</h1>

      {loading && <p>Loading history...</p>}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && !error && history.length === 0 && (
        <p>No history available.</p>
      )}

      {!loading && history.length > 0 && (
        <table
          style={{
            margin: "20px auto",
            borderCollapse: "collapse",
            width: "98%",
          }}
        >
          <thead>
            <tr>
              <th style={cellStyle}>ID</th>
              <th style={cellStyle}>Supplier</th>
              <th style={cellStyle}>Quantity</th>
              <th style={cellStyle}>Risk</th>
              <th style={cellStyle}>Recommendation</th>
              <th style={cellStyle}>Timestamp</th>
              <th style={cellStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td style={cellStyle}>{item.id}</td>

                <td style={cellStyle}>
                  {item.supplier}
                </td>

                <td style={cellStyle}>
                  {item.quantity}
                </td>

                <td style={cellStyle}>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: getRiskColor(item.risk),
                    }}
                  >
                    {item.risk}
                  </span>
                </td>

                <td style={cellStyle}>
                  {item.recommendation}
                </td>

                <td style={cellStyle}>
                  {item.timestamp}
                </td>

                <td style={cellStyle}>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const cellStyle = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "left",
};

export default DecisionHistory;