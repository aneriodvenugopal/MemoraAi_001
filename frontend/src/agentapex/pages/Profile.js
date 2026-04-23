import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Home, Search, PlusSquare, Heart, User,
  Settings, Grid3X3, Bookmark, ChevronRight, LogOut,
  Camera, Loader2, Share2, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === `/agentapex${path}` || (path === '/' && location.pathname === '/agentapex');
  
  return (
    <nav className="bottom-nav ios-nav">
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex')} data-testid="nav-home" className="flex flex-col items-center gap-1">
        <Home className={`w-6 h-6 transition-all duration-200 ${isActive('/') ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={isActive('/') ? 2.5 : 1.5} />
        {isActive('/') && <motion.div layoutId="navIndicator" className="w-1 h-1 bg-blue-500 rounded-full" />}
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex/search')} data-testid="nav-search" className="flex flex-col items-center gap-1">
        <Search className={`w-6 h-6 transition-all duration-200 ${isActive('/search') ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={isActive('/search') ? 2.5 : 1.5} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex/post')} data-testid="nav-post" className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <PlusSquare className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex/favorites')} data-testid="nav-favorites" className="flex flex-col items-center gap-1">
        <Heart className={`w-6 h-6 transition-all duration-200 ${isActive('/favorites') ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} strokeWidth={isActive('/favorites') ? 2.5 : 1.5} />
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex/profile')} data-testid="nav-profile" className="flex flex-col items-center gap-1">
        <User className={`w-6 h-6 transition-all duration-200 ${isActive('/profile') ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={isActive('/profile') ? 2.5 : 1.5} />
      </motion.button>
    </nav>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, api, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [stats, setStats] = useState({ properties: 0, leads: 0, followups: 0, favorites: 0 });
  const fileInputRef = useRef(null);

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
      const res = await api().put('/auth/profile', null, { 
        params: { name, email, designation } 
      });
      if (setUser) setUser(res.data);
      setEditing(false); 
      toast.success('Profile updated!');
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api().post('/auth/profile-image', formData);
      
      if (res.data.url) {
        // Update local user state
        const meRes = await api().get('/auth/me');
        if (setUser) setUser(meRes.data);
        toast.success('Profile photo updated!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  const handleShareInvite = () => {
    const inviteText = `*Install AgentApex*

Free Pocket Property Diary

Just Add Property
App Will Do Business For You
Even While You Sleep

Join Now
https://agentapex.com

_AgentApex - Your Property Partner_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteText)}`, '_blank');
  };

  const handleLogout = () => { 
    if (window.confirm('Are you sure you want to logout?')) { 
      logout(); 
      navigate('/agentapex/login'); 
    } 
  };

  const profileImageUrl = user?.profile_image 
    ? `${API_BASE}${user.profile_image}` 
    : null;

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{user?.name || user?.phone}</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleShareInvite} data-testid="share-invite-btn" className="w-10 h-10 flex items-center justify-center" title="Share App Invite">
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={() => navigate('/agentapex/settings')} className="w-10 h-10 flex items-center justify-center">
              <Settings className="w-6 h-6 text-gray-900" />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-4 py-6">
        <div className="flex items-start gap-6">
          {/* Avatar with Upload */}
          <div className="relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              data-testid="photo-input"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              data-testid="upload-photo-btn"
              className="relative w-20 h-20 rounded-full overflow-hidden"
            >
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
              {/* Camera overlay */}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                {uploadingPhoto ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
            {/* Camera badge */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex-1 flex justify-around pt-2">
            <button onClick={() => navigate('/agentapex/my-properties')} className="text-center">
              <p className="text-xl font-bold text-gray-900">{stats.properties}</p>
              <p className="text-xs text-gray-500">Properties</p>
            </button>
            <button onClick={() => navigate('/agentapex/leads')} className="text-center">
              <p className="text-xl font-bold text-gray-900">{stats.leads}</p>
              <p className="text-xs text-gray-500">Leads</p>
            </button>
            <button onClick={() => navigate('/agentapex/followups')} className="text-center">
              <p className="text-xl font-bold text-gray-900">{stats.followups}</p>
              <p className="text-xs text-gray-500">Follow-ups</p>
            </button>
          </div>
        </div>

        {/* Name, Designation & Bio */}
        <div className="mt-4">
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                data-testid="input-name"
              />
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Designation (e.g., Property Consultant)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                data-testid="input-designation"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                data-testid="input-email"
              />
            </div>
          ) : (
            <>
              <p className="font-semibold text-gray-900">{user?.name || 'Add your name'}</p>
              {user?.designation && <p className="text-sm text-blue-600 font-medium">{user.designation}</p>}
              <p className="text-sm text-gray-500 mt-0.5">{user?.phone}</p>
              {user?.email && <p className="text-sm text-gray-500">{user?.email}</p>}
            </>
          )}
        </div>

        {/* Edit/Save Button */}
        <div className="mt-4">
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-900 font-semibold rounded-lg">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-500 text-white font-semibold rounded-lg" data-testid="save-btn">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="w-full py-2.5 bg-gray-100 text-gray-900 font-semibold rounded-lg" data-testid="edit-btn">
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Share App Invite Card */}
      <div className="px-4 mb-4">
        <button 
          onClick={handleShareInvite}
          data-testid="invite-card-btn"
          className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl text-left text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-base">Invite Agents via WhatsApp</p>
              <p className="text-sm text-white/80">Share AgentApex with your network</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60" />
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-gray-100">
        <button className="flex-1 py-3 flex items-center justify-center border-b-2 border-gray-900">
          <Grid3X3 className="w-6 h-6 text-gray-900" />
        </button>
        <button onClick={() => navigate('/agentapex/favorites')} className="flex-1 py-3 flex items-center justify-center">
          <Bookmark className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Properties Grid */}
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

      {/* Logout */}
      <div className="px-4 py-4">
        <button onClick={handleLogout} data-testid="logout-btn" className="w-full py-3 text-red-500 font-medium text-center">
          Log Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
