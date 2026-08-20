import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("supplypilot_logged_in");
    navigate("/login");
  };

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

        <NavLink to="/prescriptions">Prescriptions</NavLink>

        <NavLink to="/history">Decision History</NavLink>

        <NavLink to="/executed-decisions">
          Executed Decisions
        </NavLink>

        <NavLink to="/analytics">
          Decision Analytics
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;