import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage       from "./pages/LoginPage";
import Dashboard       from "./pages/Dashboard";
import SessionSetup    from "./pages/SessionSetup";
import CoachingSession from "./pages/CoachingSession";
import CoachingReport  from "./pages/CoachingReport";
import { trackPageView } from "./utils/analytics";

// Fires a GA4 page_view on every React Router navigation
const PageViewTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  return null;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #4f6ef7", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <>
    <PageViewTracker />
    <Routes>
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/session/new"    element={<ProtectedRoute><SessionSetup /></ProtectedRoute>} />
      <Route path="/session/record" element={<ProtectedRoute><CoachingSession /></ProtectedRoute>} />
      <Route path="/report/:id"     element={<ProtectedRoute><CoachingReport /></ProtectedRoute>} />
      <Route path="*"               element={<Navigate to="/login" replace />} />
    </Routes>
  </>
);

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#1a1d27", color: "#e5e7eb", border: "1px solid #2a2d3e", fontSize: 14 },
          success: { iconTheme: { primary: "#22c55e", secondary: "#1a1d27" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#1a1d27" } },
        }}
      />
    </BrowserRouter>
  </AuthProvider>
);
export default App;
