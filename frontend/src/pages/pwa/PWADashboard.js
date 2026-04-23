import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services';
import { toast } from 'sonner';
import { 
  Bell, 
  User, 
  LogOut, 
  Home, 
  Users, 
  Building2, 
  Calendar,
  FileText,
  Settings,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

// Import Capacitor Browser for in-app browsing
let Browser;
try {
  Browser = require('@capacitor/browser').Browser;
} catch (error) {
  console.log('Capacitor not available, using fallback');
}

const PWADashboard = () => {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    leads: 0,
    properties: 0,
    bookings: 0,
    tasks: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication - check both token keys for compatibility
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/pwa/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchDashboardData();
    
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchUnreadCount(),
        fetchQuickStats()
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data.unread_count);
      
      // Update app badge
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchQuickStats = async () => {
    try {
      // Mock stats for now - replace with real API calls
      setStats({
        leads: 12,
        properties: 8,
        bookings: 5,
        tasks: 7
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const openInApp = async (url, title = 'RealApex') => {
    const token = localStorage.getItem('auth_token');
    const baseUrl = process.env.REACT_APP_BACKEND_URL?.replace('/api', '') || window.location.origin;
    const fullUrl = `${baseUrl}${url}?token=${token}&from=pwa`;

    try {
      if (Browser) {
        // Use Capacitor In-App Browser
        await Browser.open({
          url: fullUrl,
          windowName: '_self',
          presentationStyle: 'fullscreen',
          toolbarColor: '#0ea5e9'
        });
      } else {
        // Fallback to regular navigation
        window.location.href = fullUrl;
      }
    } catch (error) {
      console.error('Failed to open in-app browser:', error);
      // Fallback
      window.location.href = fullUrl;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('login_timestamp');
      
      // Clear app badge
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge();
      }
      
      toast.success('Logged out successfully');
      navigate('/pwa/login');
    }
  };

  const quickActions = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Leads',
      subtitle: `${stats.leads} new`,
      url: '/leads',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: 'Properties',
      subtitle: `${stats.properties} active`,
      url: '/properties',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Bookings',
      subtitle: `${stats.bookings} pending`,
      url: '/bookings',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Reports',
      subtitle: 'View analytics',
      url: '/analytics',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-primary to-ocean-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-dashboard min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.name}</h1>
              <p className="text-white/80 text-sm capitalize">{typeof user?.role === 'string' ? user.role.replace('_', ' ') : 'User'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/pwa/notifications')}
              className="relative p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            <button
              onClick={handleLogout}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <p className="text-white/90 text-sm mb-1">Welcome back! 👋</p>
          <p className="text-white font-semibold">Ready to manage your real estate business?</p>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="px-4 -mt-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => openInApp(action.url, action.title)}
              className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center mb-3 text-white`}>
                {action.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Main Features */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="p-4 bg-gradient-to-r from-ocean-primary/10 to-ocean-secondary/10 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Full Features</h2>
            <p className="text-sm text-gray-600">Access complete functionality</p>
          </div>
          
          <div className="divide-y divide-gray-100">
            <button
              onClick={() => openInApp('/dashboard', 'Dashboard')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Full Dashboard</p>
                  <p className="text-sm text-gray-600">Complete overview</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => openInApp('/projects', 'Projects')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Projects</p>
                  <p className="text-sm text-gray-600">Manage all projects</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => openInApp('/layouts', 'Layouts')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Layouts</p>
                  <p className="text-sm text-gray-600">Property layouts</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => openInApp('/users', 'Users')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Users</p>
                  <p className="text-sm text-gray-600">Team management</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Open Full Web App */}
        <button
          onClick={() => openInApp('/dashboard', 'RealApex Full')}
          className="w-full bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white p-4 rounded-2xl shadow-lg flex items-center justify-center space-x-2 hover:shadow-xl transition-all active:scale-95"
        >
          <ExternalLink className="w-5 h-5" />
          <span className="font-semibold">Open Full Web App</span>
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-around shadow-lg">
        <button
          onClick={() => navigate('/pwa/dashboard')}
          className="flex flex-col items-center space-y-1 text-ocean-primary"
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-semibold">Home</span>
        </button>
        
        <button
          onClick={() => navigate('/pwa/notifications')}
          className="flex flex-col items-center space-y-1 text-gray-600 relative"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 right-3 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? '9' : unreadCount}
            </span>
          )}
          <span className="text-xs font-semibold">Alerts</span>
        </button>
        
        <button
          onClick={() => navigate('/pwa/profile')}
          className="flex flex-col items-center space-y-1 text-gray-600"
        >
          <User className="w-6 h-6" />
          <span className="text-xs font-semibold">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default PWADashboard;
