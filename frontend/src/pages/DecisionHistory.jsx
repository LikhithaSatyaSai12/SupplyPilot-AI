import { useEffect, useState } from "react";
import API from "../services/api";

function DecisionHistory() {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await API.get("/history");
      setHistory(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load history.");
    }
  };

  return (
    <div>
      <h1>Decision History</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {history.length === 0 ? (
        <p>No history available.</p>
      ) : (
        <table
          style={{
            margin: "20px auto",
            borderCollapse: "collapse",
            width: "80%",
          }}
        >
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Quantity</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => (
              <tr key={index}>
                <td>{item.supplier}</td>
                <td>{item.quantity}</td>
                <td>{item.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DecisionHistory;