/**
 * App.jsx - AuraBoard React SPA Root Component
 * Sets up React Router with all application routes.
 * Wraps the app in AuthProvider for global authentication state.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage    from "./pages/LoginPage";
import Dashboard    from "./pages/Dashboard";
import PhotoView    from "./pages/PhotoView";
import VoiceCheckIn from "./pages/VoiceCheckIn";
import AuraReport   from "./pages/AuraReport";
import Analytics    from "./pages/Analytics";

/**
 * ProtectedRoute - Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

/**
 * AppRoutes - Defines all SPA routes using React Router v6
 */
const AppRoutes = () => (
  <Routes>
    <Route path="/login"     element={<LoginPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/photos"    element={<ProtectedRoute><PhotoView /></ProtectedRoute>} />
    <Route path="/voice"     element={<ProtectedRoute><VoiceCheckIn /></ProtectedRoute>} />
    <Route path="/report"    element={<ProtectedRoute><AuraReport /></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
    <Route path="*"          element={<Navigate to="/login" replace />} />
  </Routes>
);

/**
 * App - Root component wrapped in AuthProvider and BrowserRouter
 */
const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);
export default App;
