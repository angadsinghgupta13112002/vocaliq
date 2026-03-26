/**
 * components/Navbar.jsx - Top Navigation Bar
 * Displays the AuraBoard logo, navigation links, and user logout button.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate("/dashboard")}>
        <span className="brand-icon">A</span> AuraBoard
      </div>
      <div className="navbar-links">
        <button onClick={() => navigate("/photos")}>Photos</button>
        <button onClick={() => navigate("/voice")}>Voice</button>
        <button onClick={() => navigate("/analytics")}>Analytics</button>
      </div>
      <div className="navbar-user">
        <span>{user?.displayName}</span>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
};
export default Navbar;
