import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect, useRef } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import CallModal from "./components/CallModal";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, connectSocket } = useAuthStore();
  const { theme } = useThemeStore();
  
  const initializedRef = useRef(false);

  if (typeof global === 'undefined') {
    window.global = window;
  }

  useEffect(() => {
    console.log("App: Checking auth...");
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authUser && !initializedRef.current) {
      console.log("App: Auth user detected, ensuring socket connection...");
      connectSocket();
      initializedRef.current = true;
    }
  }, [authUser, connectSocket]);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <>
      <div data-theme={theme}>
        <Navbar />
        <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        </Routes>
        <Toaster />
      </div>
      <CallModal />
    </>
  );
};

export default App;
