import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Home, Search, PlusSquare, Heart, User,
  Settings, Grid3X3, Bookmark, ChevronRight, LogOut
} from 'lucide-react';

// Bottom Navigation (same as Dashboard)
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

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, api } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ properties: 0, leads: 0, followups: 0, favorites: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api().get('/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchStats();
  }, [api]);

  const handleSave = async () => {
    setSaving(true);
    try { 
      await updateProfile({ name, email }); 
      setEditing(false); 
    } catch (e) { 
      console.error(e); 
    }
    setSaving(false);
  };

  const handleLogout = () => { 
    if (window.confirm('Are you sure you want to logout?')) { 
      logout(); 
      navigate('/login'); 
    } 
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Header - Instagram style */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{user?.name || user?.phone}</h1>
          <button onClick={() => navigate('/settings')} className="w-10 h-10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-gray-900" />
          </button>
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-4 py-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          
          {/* Stats */}
          <div className="flex-1 flex justify-around pt-2">
            <button onClick={() => navigate('/my-properties')} className="text-center">
              <p className="text-xl font-bold text-gray-900">{stats.properties}</p>
              <p className="text-xs text-gray-500">Properties</p>
            </button>
            <button onClick={() => navigate('/leads')} className="text-center">
              <p className="text-xl font-bold text-gray-900">{stats.leads}</p>
              <p className="text-xs text-gray-500">Leads</p>
            </button>
            <button onClick={() => navigate('/followups')} className="text-center">
              <p className="text-xl font-bold text-gray-900">{stats.followups}</p>
              <p className="text-xs text-gray-500">Follow-ups</p>
            </button>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mt-4">
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full"
                data-testid="input-name"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full"
                data-testid="input-email"
              />
            </div>
          ) : (
            <>
              <p className="font-semibold text-gray-900">{user?.name || 'Add your name'}</p>
              <p className="text-sm text-gray-500 mt-0.5">{user?.phone}</p>
              {user?.email && <p className="text-sm text-gray-500">{user?.email}</p>}
            </>
          )}
        </div>

        {/* Edit/Save Button */}
        <div className="mt-4">
          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-900 font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-500 text-white font-semibold rounded-lg"
                data-testid="save-btn"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full py-2.5 bg-gray-100 text-gray-900 font-semibold rounded-lg"
              data-testid="edit-btn"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-gray-100">
        <button className="flex-1 py-3 flex items-center justify-center border-b-2 border-gray-900">
          <Grid3X3 className="w-6 h-6 text-gray-900" />
        </button>
        <button 
          onClick={() => navigate('/favorites')}
          className="flex-1 py-3 flex items-center justify-center"
        >
          <Bookmark className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Properties Grid (placeholder) */}
      <div className="p-1">
        {stats.properties > 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {[...Array(Math.min(stats.properties, 9))].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Grid3X3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No properties yet</p>
          </div>
        )}
      </div>

      {/* Logout - at bottom before nav */}
      <div className="px-4 py-4">
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full py-3 text-red-500 font-medium text-center"
        >
          Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
