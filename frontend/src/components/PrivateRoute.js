import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import AuthenticatedLayout from './AuthenticatedLayout';

// Check for customer portal session
const getCustomerSession = () => {
  try {
    const session = localStorage.getItem('customerPortalSession');
    if (!session) return null;
    const parsed = JSON.parse(session);
    if (new Date(parsed.expires_at) < new Date()) {
      localStorage.removeItem('customerPortalSession');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const customerSession = getCustomerSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Allow access if either regular auth OR customer portal session exists
  const hasAccess = isAuthenticated || customerSession;
  
  // For customer-dashboard, allow customer portal session
  if (location.pathname === '/customer-dashboard' && customerSession) {
    return (
      <AuthenticatedLayout>
        {children}
      </AuthenticatedLayout>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthenticatedLayout>
      {children}
    </AuthenticatedLayout>
  );
};

export default PrivateRoute;
