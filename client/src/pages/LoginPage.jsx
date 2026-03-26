/**
 * pages/LoginPage.jsx - OAuth Login Screen
 * Entry point for users to authenticate via Google Photos or Instagram.
 * Redirects to backend OAuth endpoints which handle the full OAuth 2.0 flow.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { user, loginWithToken } = useAuth();
  const navigate = useNavigate();

  // If redirected back from OAuth with a token in the URL, store it
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const token   = params.get("token");
    if (token) {
      loginWithToken(token);
      navigate("/dashboard", { replace: true });
    }
  }, []);

  // If already logged in, skip login screen
  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user]);

  // Redirect user to the backend Google OAuth initiation endpoint
  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:8080/api"}/auth/google`;
  };

  // Redirect user to the backend Instagram OAuth initiation endpoint
  const handleInstagramLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:8080/api"}/auth/instagram`;
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">A</div>
        <h1>AuraBoard</h1>
        <p>AI Emotional Intelligence Mirror</p>
        <p className="login-subtitle">Understand yourself through your photos & voice</p>
        <button onClick={handleGoogleLogin} className="btn-google">
          Connect Google Photos
        </button>
        <button onClick={handleInstagramLogin} className="btn-instagram">
          Connect Instagram
        </button>
        <p className="login-note">Secure OAuth 2.0 — we never store your password</p>
      </div>
    </div>
  );
};
export default LoginPage;
