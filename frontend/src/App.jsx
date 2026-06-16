import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import { getStoredToken, getStoredUser, clearAuth } from "./services/authService";

export default function App() {
  const [user,  setUser]  = useState(getStoredUser());
  const [token, setToken] = useState(getStoredToken());

  const handleLogin = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setToken(null);
  };

  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard user={user} token={token} onLogout={handleLogout} />;
}
