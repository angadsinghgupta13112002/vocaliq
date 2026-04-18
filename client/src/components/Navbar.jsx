import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <nav className="navbar">
      <NavLink to="/dashboard" className="navbar-logo">
        <div className="navbar-logo-icon">V</div>
        VocalIQ
      </NavLink>

      <NavLink to="/dashboard" className={({ isActive }) => `navbar-link${isActive ? " active" : ""}`}>
        Dashboard
      </NavLink>
      <NavLink to="/session/new" className={({ isActive }) => `navbar-link${isActive ? " active" : ""}`}>
        New Session
      </NavLink>

      <div className="navbar-spacer" />

      <div className="navbar-user">
        <div className="navbar-avatar">
          {user?.photoURL
            ? <img src={user.photoURL} alt={user.displayName} />
            : (user?.displayName?.[0] || "U")}
        </div>
        <span style={{ fontSize: 13, color: "var(--muted)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user?.displayName?.split(" ")[0]}
        </span>
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 6 }}
          onMouseOver={e => e.currentTarget.style.color = "white"}
          onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
};
export default Navbar;
