import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const storedUser = localStorage.getItem("supplypilot_user");

    if (!storedUser) {
      setError("Account not found. Please create an account first.");
      return;
    }

    const user = JSON.parse(storedUser);

    if (email !== user.email || password !== user.password) {
      setError("Invalid email or password.");
      return;
    }

    localStorage.setItem("supplypilot_logged_in", "true");

    navigate("/");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">SP</div>
          <h1>SupplyPilot-AI</h1>
          <p>Supply Chain Intelligence</p>
        </div>

        <h2>Welcome Back</h2>

        <p className="auth-subtitle">
          Login to access your supply-chain intelligence dashboard.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="auth-button">
            Login
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register">Create Account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;