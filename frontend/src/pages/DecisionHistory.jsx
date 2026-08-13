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
      setError("Could not load history.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Decision History</h1>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading history...</p>
      ) : history.length === 0 ? (
        <p>No history available.</p>
      ) : (
        <table
          style={{
            margin: "20px auto",
            borderCollapse: "collapse",
            width: "95%",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                }}
              >
                Supplier
              </th>

              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                }}
              >
                Quantity
              </th>

              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                }}
              >
                Risk
              </th>

              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                }}
              >
                Recommendation
              </th>

              <th
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                }}
              >
                Timestamp
              </th>
            </tr>
          </thead>

          <tbody>
            {history.map((item, index) => (
              <tr key={index}>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px",
                  }}
                >
                  {item.supplier}
                </td>

                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px",
                  }}
                >
                  {item.quantity}
                </td>

                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px",
                  }}
                >
                  {item.risk}
                </td>

                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px",
                  }}
                >
                  {item.recommendation}
                </td>

                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "10px",
                  }}
                >
                  {item.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DecisionHistory;