import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Incomelands specific API URL
const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api/incomelands`;

// Storage keys with prefix to avoid conflicts with main app
const TOKEN_KEY = 'incomelands_token';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const api = useCallback(() => {
    const instance = axios.create({
      baseURL: API_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return instance;
  }, [token]);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await api().get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Auth error:', error);
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token, api]);

  const sendOtp = async (phone) => {
    const response = await axios.post(`${API_URL}/auth/send-otp`, { phone });
    return response.data;
  };

  const verifyOtp = async (phone, otp) => {
    const response = await axios.post(`${API_URL}/auth/verify-otp`, { phone, otp });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    const response = await api().put('/auth/profile', null, { params: data });
    setUser(response.data);
    return response.data;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    sendOtp,
    verifyOtp,
    logout,
    updateProfile,
    api
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
