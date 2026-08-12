import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div
      style={{
        width: "220px",
        background: "#263238",
        color: "white",
        padding: "20px",
      }}
    >
      <h2>Menu</h2>

      <NavLink
        to="/"
        style={{ display: "block", color: "white", textDecoration: "none", margin: "10px 0" }}
      >
        Dashboard
      </NavLink>

      <NavLink
        to="/prediction"
        style={{ display: "block", color: "white", textDecoration: "none", margin: "10px 0" }}
      >
        Prediction
      </NavLink>

      <NavLink
        to="/recommendations"
        style={{ display: "block", color: "white", textDecoration: "none", margin: "10px 0" }}
      >
        Recommendations
      </NavLink>

      <NavLink
        to="/history"
        style={{ display: "block", color: "white", textDecoration: "none", margin: "10px 0" }}
      >
        History
      </NavLink>
    </div>
  );
}

export default Sidebar;