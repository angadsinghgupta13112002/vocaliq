/**
 * context/AuthContext.jsx - Global Authentication State Provider
 * Manages the logged-in user's state and JWT token across the entire SPA.
 * Wrap the app in <AuthProvider> to make auth state available everywhere.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
import { createContext, useContext, useState, useEffect } from "react";
import { TOKEN_KEY } from "../utils/constants";
import api from "../services/api";

// Create the auth context
const AuthContext = createContext(null);

/**
 * AuthProvider - Wraps the app and provides auth state to all children
 */
export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // True while checking existing token

  // On app load, check if a JWT token already exists and fetch user info
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      api.get("/auth/me")
        .then((res) => setUser(res.data.user))
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // loginWithToken - Called after OAuth callback with JWT from backend
  const loginWithToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    api.get("/auth/me").then((res) => setUser(res.data.user));
  };

  // logout - Clears token and user state
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth - Custom hook for consuming auth context in any component
export const useAuth = () => useContext(AuthContext);
