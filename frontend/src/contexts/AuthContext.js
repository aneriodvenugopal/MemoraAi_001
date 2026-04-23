import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { authService } from '../services';
import notificationService from "../services/notificationService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user and token from localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const tokenExpiry = localStorage.getItem('token_expiry');

    if (storedToken && storedUser) {
      // Check if token has expired
      if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
        // Token expired, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('token_expiry');
        localStorage.removeItem('remember_me');
      } else {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const login = async (phone, otp) => {
    try {
      const data = await authService.verifyOTP(phone, otp);
      
      // Check if this is a customer login (no regular user account)
      if (data.account_type === 'customer' || data.token_type === 'customer_session') {
        // For customer portal, don't set regular auth state
        // The Login.js will handle storing customerPortalSession
        return data;
      }
      
      // Regular user login
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('user_id', data.user.id);
      
      // Initialize Firebase notifications after successful login
      if (data.user && data.user.id) {
        setTimeout(() => {
          notificationService.initialize(data.user.id);
        }, 2000); // Wait 2 seconds after login
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const loginWithPassword = async (token, user, rememberMe = false) => {
    try {
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user_id', user.id);
      localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');
      
      // Calculate and store token expiry
      const expiryDays = rememberMe ? 30 : 1;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      localStorage.setItem('token_expiry', expiryDate.toISOString());
      
      // Initialize Firebase notifications after successful login
      if (user && user.id) {
        setTimeout(() => {
          notificationService.initialize(user.id);
        }, 2000);
      }
      
      return { access_token: token, user };
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('remember_me');
    authService.logout();
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithPassword,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
