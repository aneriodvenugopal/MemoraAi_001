import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Home, Search, PlusSquare, Heart, User,
  Building2, MapPin, Users, TrendingUp, ChevronRight,
  FileText, Clock
} from 'lucide-react';

// Instagram-style Bottom Navigation
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="bottom-nav">
      <button onClick={() => navigate('/')} data-testid="nav-home">
        <Home className={`w-6 h-6 ${isActive('/') ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/') ? 2.5 : 1.5} />
      </button>
      <button onClick={() => navigate('/search')} data-testid="nav-search">
        <Search className={`w-6 h-6 ${isActive('/search') ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/search') ? 2.5 : 1.5} />
      </button>
      <button onClick={() => navigate('/post')} data-testid="nav-post">
        <PlusSquare className={`w-6 h-6 ${isActive('/post') ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/post') ? 2.5 : 1.5} />
      </button>
      <button onClick={() => navigate('/favorites')} data-testid="nav-favorites">
        <Heart className={`w-6 h-6 ${isActive('/favorites') ? 'text-gray-900 fill-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/favorites') ? 2.5 : 1.5} />
      </button>
      <button onClick={() => navigate('/profile')} data-testid="nav-profile">
        <User className={`w-6 h-6 ${isActive('/profile') ? 'text-gray-900' : 'text-gray-400'}`} strokeWidth={isActive('/profile') ? 2.5 : 1.5} />
      </button>
    </nav>
  );
};

// Stat Card
const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 text-left"
  >
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-gray-500 text-sm">{label}</p>
  </motion.button>
);

// Menu Item
const MenuItem = ({ icon: Icon, label, sublabel, onClick, badge }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 bg-white border-b border-gray-50 active:bg-gray-50"
  >
    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
      <Icon className="w-6 h-6 text-gray-600" />
    </div>
    <div className="flex-1 text-left">
      <p className="text-base font-medium text-gray-900">{label}</p>
      {sublabel && <p className="text-sm text-gray-500">{sublabel}</p>}
    </div>
    <div className="flex items-center gap-2">
      {badge && (
        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
          {badge}
        </span>
      )}
      <ChevronRight className="w-5 h-5 text-gray-300" />
    </div>
  </motion.button>
);

const Dashboard = () => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ properties: 0, leads: 0, followups: 0, favorites: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api().get('/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error:', error);
      }
      setLoading(false);
    };
    fetchStats();
  }, [api]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header - Instagram style */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Incomelands</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Welcome back</p>
            <p className="text-sm font-medium text-gray-900">{user?.name || user?.phone}</p>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <div className="p-4">
        <div className="flex gap-3">
          <StatCard
            icon={Building2}
            label="Properties"
            value={loading ? '-' : stats.properties}
            color="bg-amber-500"
            onClick={() => navigate('/my-properties')}
          />
          <StatCard
            icon={TrendingUp}
            label="Leads"
            value={loading ? '-' : stats.leads}
            color="bg-green-500"
            onClick={() => navigate('/leads')}
          />
        </div>
        
        <div className="flex gap-3 mt-3">
          <StatCard
            icon={Users}
            label="Follow-ups"
            value={loading ? '-' : stats.followups}
            color="bg-blue-500"
            onClick={() => navigate('/followups')}
          />
          <StatCard
            icon={Heart}
            label="Saved"
            value={loading ? '-' : stats.favorites}
            color="bg-pink-500"
            onClick={() => navigate('/favorites')}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/post')}
          data-testid="quick-post-btn"
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-lg">Post Property</p>
              <p className="text-blue-100 text-sm">Sell your land or plot</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <PlusSquare className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.button>
      </div>

      {/* Menu List */}
      <div className="bg-white">
        <MenuItem
          icon={MapPin}
          label="Map Search"
          sublabel="Find properties near you"
          onClick={() => navigate('/search')}
        />
        <MenuItem
          icon={Building2}
          label="My Properties"
          sublabel={`${stats.properties} listed`}
          onClick={() => navigate('/my-properties')}
          badge={stats.properties > 0 ? stats.properties : null}
        />
        <MenuItem
          icon={Clock}
          label="Follow-ups"
          sublabel="Manage your contacts"
          onClick={() => navigate('/followups')}
          badge={stats.followups > 0 ? stats.followups : null}
        />
        <MenuItem
          icon={FileText}
          label="Requirements"
          sublabel="Post your property needs"
          onClick={() => navigate('/requirements')}
        />
        <MenuItem
          icon={TrendingUp}
          label="Leads"
          sublabel="Track buyer enquiries"
          onClick={() => navigate('/leads')}
          badge={stats.leads > 0 ? stats.leads : null}
        />
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
