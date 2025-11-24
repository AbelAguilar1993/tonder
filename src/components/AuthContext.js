"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  // Check for existing session on app load and validate token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const userData = localStorage.getItem("user_data");

        if (token && userData) {
          // First set user from localStorage for immediate UI response
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Then validate token with backend
          try {
            setIsValidatingToken(true);
            const response = await authService.getCurrentUser();
            // If token is valid, update user data with fresh info from server
            if (response.user) {
              setUser(response.user);
              localStorage.setItem("user_data", JSON.stringify(response.user));
            }
          } catch (error) {
            // Token is invalid/expired - clear everything
            console.log("Token validation failed, logging out user");
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_data");
            setUser(null);
          } finally {
            setIsValidatingToken(false);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        // Clear invalid data
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Use setTimeout to ensure this runs after hydration in SSR environments
    const timeoutId = setTimeout(initializeAuth, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  // Listen for auth events from API service
  useEffect(() => {
    const handleUnauthorized = () => {
      // Clear user state when token expires (401 error)
      console.log("Token expired, logging out user");
      setUser(null);
      localStorage.removeItem("user_data");
      // Optionally show auth modal or redirect
      // setIsAuthModalOpen(true);
    };

    const handleLogout = () => {
      // Handle logout event from auth service
      setUser(null);
    };

    // Add event listeners
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("auth:logout", handleLogout);

    // Cleanup
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, []);

  const login = (userData, token = null) => {
    setUser(userData);
    setIsAuthModalOpen(false); // Close modal on successful login

    // Persist user data to localStorage if not already done
    if (token) {
      localStorage.setItem("auth_token", token);
    }
    localStorage.setItem("user_data", JSON.stringify(userData));
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    setUser(null);
  };

  const openAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const getAuthToken = () => {
    return localStorage.getItem("auth_token");
  };

  const isAuthenticated = () => {
    return !!user && !!getAuthToken();
  };

  const validateToken = async () => {
    const token = getAuthToken();
    if (!token) {
      return false;
    }

    try {
      setIsValidatingToken(true);
      const response = await authService.getCurrentUser();
      if (response.user) {
        setUser(response.user);
        localStorage.setItem("user_data", JSON.stringify(response.user));
        return true;
      }
      return false;
    } catch (error) {
      console.log("Token validation failed:", error.message);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      setUser(null);
      return false;
    } finally {
      setIsValidatingToken(false);
    }
  };

  const value = {
    user,
    login,
    logout,
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
    getAuthToken,
    isAuthenticated,
    validateToken,
    loading,
    isValidatingToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
