import React, { createContext, useContext, useState, useEffect } from 'react';
import apiInstance from '../services/api';

const ModuleContext = createContext(null);

export const useModules = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
};

export const ModuleProvider = ({ children }) => {
  const [enabledModules, setEnabledModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiInstance.get('/saas-admin/my-modules');
      if (response.data.success) {
        setEnabledModules(response.data.enabled_modules);
        setIsAdmin(response.data.is_admin);
      }
    } catch (err) {
      console.error('Failed to fetch modules:', err);
      // Default to essential modules on error
      setEnabledModules([
        'dashboard', 'projects', 'leads', 'bookings_sales',
        'billing_subscription', 'users_staff'
      ]);
    } finally {
      setLoading(false);
    }
  };

  const hasModule = (moduleId) => {
    if (isAdmin) return true;
    return enabledModules.includes(moduleId);
  };

  const hasAnyModule = (moduleIds) => {
    if (isAdmin) return true;
    return moduleIds.some(id => enabledModules.includes(id));
  };

  const refreshModules = () => {
    fetchModules();
  };

  return (
    <ModuleContext.Provider value={{
      enabledModules,
      loading,
      isAdmin,
      hasModule,
      hasAnyModule,
      refreshModules
    }}>
      {children}
    </ModuleContext.Provider>
  );
};

export default ModuleContext;
