import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { Toaster } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import QuickPropertyPost from './pages/QuickPropertyPost';
import VoicePropertyPost from './pages/VoicePropertyPost';
import QuickPropertyEdit from './pages/QuickPropertyEdit';
import MapSearch from './pages/MapSearch';
import MyProperties from './pages/MyProperties';
import Favorites from './pages/Favorites';
import FollowUps from './pages/FollowUps';
import Requirements from './pages/Requirements';
import Leads from './pages/Leads';
import Profile from './pages/Profile';
import PropertyDetail from './pages/PropertyDetail';
import DocumentManager from './pages/DocumentManager';

// Import Incomelands specific styles
import './incomelands.css';

// Page transition wrapper
const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    {children}
  </motion.div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/incomelandsapp/login" replace />;
  }
  
  return <PageWrapper>{children}</PageWrapper>;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/incomelandsapp" replace />;
  }
  
  return <PageWrapper>{children}</PageWrapper>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="post" element={<ProtectedRoute><QuickPropertyPost /></ProtectedRoute>} />
        <Route path="post/voice" element={<ProtectedRoute><VoicePropertyPost /></ProtectedRoute>} />
        <Route path="property/:id/edit" element={<ProtectedRoute><QuickPropertyEdit /></ProtectedRoute>} />
        <Route path="search" element={<ProtectedRoute><MapSearch /></ProtectedRoute>} />
        <Route path="my-properties" element={<ProtectedRoute><MyProperties /></ProtectedRoute>} />
        <Route path="favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="followups" element={<ProtectedRoute><FollowUps /></ProtectedRoute>} />
        <Route path="requirements" element={<ProtectedRoute><Requirements /></ProtectedRoute>} />
        <Route path="leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="property/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
        <Route path="property/:propertyId/documents" element={<ProtectedRoute><DocumentManager /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/incomelandsapp" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function IncomelandsApp() {
  return (
    <AuthProvider>
      <LocationProvider>
        <div className="incomelands-app min-h-screen bg-white">
          <AnimatedRoutes />
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: '#262626',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '14px',
                padding: '12px 16px',
              }
            }}
          />
        </div>
      </LocationProvider>
    </AuthProvider>
  );
}

export default IncomelandsApp;
