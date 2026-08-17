import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>SupplyPilot-AI</h2>
        <p>AI Supply Chain Management</p>
      </div>

      <nav className="sidebar-menu">
        <NavLink to="/">Dashboard</NavLink>

        <NavLink to="/prediction">Prediction</NavLink>

        <NavLink to="/recommendations">Recommendations</NavLink>

        <NavLink to="/history">Decision History</NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;