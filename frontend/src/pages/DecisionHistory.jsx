import { useEffect, useState } from "react";
import API from "../services/api";

function DecisionHistory() {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const response = await API.get("/history");

      setHistory(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load decision history.");
    } finally {
      setLoading(false);
    }
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

      {!loading && !error && history.length > 0 && (
        <table
          style={{
            margin: "20px auto",
            borderCollapse: "collapse",
            width: "95%",
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
            </tr>
          </thead>

          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td style={cellStyle}>{item.id}</td>
                <td style={cellStyle}>{item.supplier}</td>
                <td style={cellStyle}>{item.quantity}</td>
                <td style={cellStyle}>{item.risk}</td>
                <td style={cellStyle}>{item.recommendation}</td>
                <td style={cellStyle}>{item.timestamp}</td>
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