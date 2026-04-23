import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { DemoGuideProvider } from './components/DemoGuide';
import { Toaster } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

// Lazy load pages for faster initial load
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuickPropertyPost = lazy(() => import('./pages/QuickPropertyPost'));
const VoicePropertyPost = lazy(() => import('./pages/VoicePropertyPost'));
const QuickPropertyEdit = lazy(() => import('./pages/PropertyEdit'));
const MapSearch = lazy(() => import('./pages/MapSearch'));
const MyProperties = lazy(() => import('./pages/MyProperties'));
const Favorites = lazy(() => import('./pages/Favorites'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const Requirements = lazy(() => import('./pages/Requirements'));
const Leads = lazy(() => import('./pages/Leads'));
const Profile = lazy(() => import('./pages/Profile'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const DocumentManager = lazy(() => import('./pages/DocumentManager'));
const InterestAreas = lazy(() => import('./pages/InterestAreas'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PropertySearchById = lazy(() => import('./pages/PropertySearchById'));

import './index.css';

// iOS-like spring configuration
const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1
};

// iOS-style page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: 50,
    scale: 0.98
  },
  enter: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      ...springTransition,
      opacity: { duration: 0.2 }
    }
  },
  exit: {
    opacity: 0,
    x: -30,
    scale: 0.98,
    transition: {
      duration: 0.15
    }
  }
};

// Fade variant for modals/overlays
const fadeVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

// iOS-style Loading Spinner
const LoadingSpinner = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 bg-white flex items-center justify-center"
  >
    <div className="text-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full mx-auto"
      />
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-gray-500 text-sm"
      >
        Loading...
      </motion.p>
    </div>
  </motion.div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AgentApex Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-white flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-4">Please refresh the page</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-sky-500 text-white rounded-xl font-medium"
            >
              Refresh
            </motion.button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// iOS-style Page Wrapper with smooth transitions
const PageWrapper = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="enter"
    exit="exit"
    className="min-h-screen"
  >
    {children}
  </motion.div>
);

// iOS-style skeleton loading
const SkeletonLoader = () => (
  <div className="fixed inset-0 bg-white flex items-center justify-center">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"
    />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <SkeletonLoader />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/agentapex/login" replace />;
  }
  
  return <PageWrapper>{children}</PageWrapper>;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <SkeletonLoader />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/agentapex" replace />;
  }
  
  return <PageWrapper>{children}</PageWrapper>;
};

// Register AgentApex Service Worker for PWA (PWABuilder compatible)
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/pwabuilder-sw.js', { scope: '/agentapex' })
      .then((registration) => {
        console.log('[AgentApex] SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[AgentApex] SW registration failed:', error);
      });
  }
};

// Swipe-back gesture handler for iOS-like navigation
const SwipeBackHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Set AgentApex specific PWA manifest
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.href = '/agentapex-manifest.json';
    }
    
    // Set theme color for AgentApex (navy blue)
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.content = '#1a365d';
    }
    
    // Add apple-touch-icon for iOS
    let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleTouchIcon) {
      appleTouchIcon.href = '/agentapex-apple-touch-icon.png';
    }
    
    // Register service worker
    registerServiceWorker();
    
    return () => {
      // Restore default manifest when leaving AgentApex
      if (manifestLink) {
        manifestLink.href = '/manifest.json';
      }
      if (themeColor) {
        themeColor.content = '#0ea5e9';
      }
    };
  }, []);
  
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    
    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = Math.abs(endY - startY);
      
      // Swipe from left edge to go back (iOS-style)
      if (startX < 30 && diffX > 80 && diffY < 50) {
        if (location.pathname !== '/agentapex' && location.pathname !== '/agentapex/login') {
          navigate(-1);
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate, location]);
  
  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <SwipeBackHandler>
      <AnimatePresence mode="wait" initial={false}>
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
          <Route path="interest-areas" element={<ProtectedRoute><InterestAreas /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="search-property" element={<PropertySearchById />} />
          
          <Route path="*" element={<Navigate to="/agentapex" replace />} />
        </Routes>
      </AnimatePresence>
    </SwipeBackHandler>
  );
};

function AgentApexApp() {
  // Prevent overscroll bounce on the whole app (iOS)
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = '';
    };
  }, []);
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocationProvider>
          <DemoGuideProvider>
            <div className="agentapex-app">
              <Suspense fallback={<LoadingSpinner />}>
                <AnimatedRoutes />
              </Suspense>
              <Toaster 
                position="top-center"
                expand={false}
                richColors
                toastOptions={{
                  style: {
                    background: 'rgba(38, 38, 38, 0.95)',
                    backdropFilter: 'blur(10px)',
                    color: '#FFFFFF',
                    borderRadius: '14px',
                    fontSize: '14px',
                    padding: '14px 18px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  },
                  duration: 2500
                }}
              />
            </div>
          </DemoGuideProvider>
        </LocationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default AgentApexApp;
