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
    localStorage.removeItem('impersonation');
    localStorage.removeItem('admin_token_backup');
    localStorage.removeItem('admin_user_backup');
    authService.logout();
  };

  // ── Impersonation helpers (SaaS admin → Login as Business) ──
  const startImpersonation = (impToken, impUser, meta) => {
    // Back up the admin's own session so we can restore on exit
    const currentToken = localStorage.getItem('token');
    const currentUser = localStorage.getItem('user');
    if (currentToken) localStorage.setItem('admin_token_backup', currentToken);
    if (currentUser) localStorage.setItem('admin_user_backup', currentUser);

    setToken(impToken);
    setUser(impUser);
    localStorage.setItem('token', impToken);
    localStorage.setItem('user', JSON.stringify(impUser));
    localStorage.setItem('user_id', impUser.id);
    localStorage.setItem('impersonation', JSON.stringify({
      active: true,
      tenant_name: meta?.tenant_name,
      started_at: new Date().toISOString(),
    }));
  };

  const stopImpersonation = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/memoraai/saas-admin/impersonate/end`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token_backup') || currentToken}` },
        });
      }
    } catch (e) { /* swallow */ }

    const backupToken = localStorage.getItem('admin_token_backup');
    const backupUser = localStorage.getItem('admin_user_backup');
    if (backupToken && backupUser) {
      setToken(backupToken);
      setUser(JSON.parse(backupUser));
      localStorage.setItem('token', backupToken);
      localStorage.setItem('user', backupUser);
      localStorage.removeItem('admin_token_backup');
      localStorage.removeItem('admin_user_backup');
      localStorage.removeItem('impersonation');
    } else {
      logout();
    }
  };

  const isImpersonating = () => {
    try {
      const raw = localStorage.getItem('impersonation');
      return raw ? JSON.parse(raw)?.active === true : false;
    } catch { return false; }
  };

  const getImpersonationMeta = () => {
    try { return JSON.parse(localStorage.getItem('impersonation') || 'null'); }
    catch { return null; }
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithPassword,
    logout,
    startImpersonation,
    stopImpersonation,
    isImpersonating,
    getImpersonationMeta,
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
