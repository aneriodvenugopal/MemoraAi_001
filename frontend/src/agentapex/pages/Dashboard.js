import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemoGuide, HelpButton } from '../components/DemoGuide';
import { motion } from 'framer-motion';
import { 
  Home, Search, PlusSquare, Heart, User,
  Building2, MapPin, Users, TrendingUp, ChevronRight,
  FileText, Clock, Bell, Share2, Download, Smartphone, ClipboardList, Hash
} from 'lucide-react';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === `/agentapex${path}` || (path === '/' && location.pathname === '/agentapex');
  
  return (
    <nav className="bottom-nav ios-nav">
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex')} data-testid="nav-home" className="flex flex-col items-center gap-1">
        <Home className={`w-6 h-6 transition-all duration-200 ${isActive('/') ? 'text-[#1a365d]' : 'text-gray-400'}`} strokeWidth={isActive('/') ? 2.5 : 1.5} />
        {isActive('/') && <motion.div layoutId="navIndicator" className="w-1 h-1 bg-[#1a365d] rounded-full" />}
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex/search')} data-testid="nav-search" className="flex flex-col items-center gap-1">
        <MapPin className={`w-6 h-6 transition-all duration-200 ${isActive('/search') ? 'text-[#1a365d]' : 'text-gray-400'}`} strokeWidth={isActive('/search') ? 2.5 : 1.5} />
        {isActive('/search') && <motion.div layoutId="navIndicator" className="w-1 h-1 bg-[#1a365d] rounded-full" />}
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex/post')} data-testid="nav-post" className="flex flex-col items-center gap-1">
        <div className="w-10 h-10 bg-gradient-to-br from-[#1a365d] to-[#2c5282] rounded-xl flex items-center justify-center shadow-lg shadow-[#1a365d]/30">
          <PlusSquare className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex/favorites')} data-testid="nav-favorites" className="flex flex-col items-center gap-1">
        <Heart className={`w-6 h-6 transition-all duration-200 ${isActive('/favorites') ? 'text-pink-500 fill-pink-500' : 'text-gray-400'}`} strokeWidth={isActive('/favorites') ? 2.5 : 1.5} />
        {isActive('/favorites') && <motion.div layoutId="navIndicator" className="w-1 h-1 bg-pink-500 rounded-full" />}
      </motion.button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate('/agentapex/profile')} data-testid="nav-profile" className="flex flex-col items-center gap-1">
        <User className={`w-6 h-6 transition-all duration-200 ${isActive('/profile') ? 'text-[#1a365d]' : 'text-gray-400'}`} strokeWidth={isActive('/profile') ? 2.5 : 1.5} />
        {isActive('/profile') && <motion.div layoutId="navIndicator" className="w-1 h-1 bg-[#1a365d] rounded-full" />}
      </motion.button>
    </nav>
  );
};

const StatCard = ({ icon: Icon, label, value, color, bgColor, onClick }) => (
  <motion.button
    variants={itemVariants}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    data-testid={`stat-${label.toLowerCase()}`}
    className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 text-left shadow-sm active:shadow-none transition-shadow"
  >
    <div className={`w-10 h-10 ${bgColor || 'bg-gray-100'} rounded-xl flex items-center justify-center mb-3`}>
      <Icon className={`w-5 h-5 ${color || 'text-gray-600'}`} />
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-gray-500 text-sm">{label}</p>
  </motion.button>
);

const MenuItem = ({ icon: Icon, iconColor, iconBg, label, sublabel, onClick, badge, badgeColor }) => (
  <motion.button
    variants={itemVariants}
    whileTap={{ scale: 0.98, backgroundColor: 'rgba(0,0,0,0.02)' }}
    onClick={onClick}
    data-testid={`menu-${label.toLowerCase().replace(/\s+/g, '-')}`}
    className="w-full flex items-center gap-4 px-5 py-4 bg-white border-b border-gray-50 transition-colors"
  >
    <div className={`w-10 h-10 ${iconBg || 'bg-gray-100'} rounded-full flex items-center justify-center`}>
      <Icon className={`w-5 h-5 ${iconColor || 'text-gray-600'}`} />
    </div>
    <div className="flex-1 text-left">
      <p className="text-[15px] font-medium text-gray-900">{label}</p>
      {sublabel && <p className="text-[13px] text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
    <div className="flex items-center gap-2">
      {badge && (
        <span className={`min-w-[22px] h-[22px] px-1.5 ${badgeColor || 'bg-blue-500'} text-white text-xs font-semibold rounded-full flex items-center justify-center`}>
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </div>
  </motion.button>
);

const Dashboard = () => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const { startDemo } = useDemoGuide();
  const [stats, setStats] = useState({ properties: 0, leads: 0, followups: 0, favorites: 0 });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const seenDemos = JSON.parse(localStorage.getItem('agentapex_seen_demos') || '{}');
    if (!seenDemos['dashboard']) {
      const timer = setTimeout(() => startDemo('dashboard'), 1000);
      return () => clearTimeout(timer);
    }
  }, [startDemo]);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsIOS(iOS);
    setIsStandalone(standalone);
    const dismissed = localStorage.getItem('agentapex_install_dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    if (!standalone && dismissedTime < Date.now() - 86400000) setShowInstallBanner(true);
  }, []);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { toast.success('App installed!'); setShowInstallBanner(false); localStorage.setItem('agentapex_install_dismissed', Date.now().toString()); }
      setDeferredPrompt(null);
    } else if (isIOS) {
      toast.info(<div className="text-left"><p className="font-semibold mb-1">Install on iPhone:</p><p>1. Tap the <strong>Share</strong> button</p><p>2. Tap <strong>"Add to Home Screen"</strong></p></div>, { duration: 8000 });
    } else {
      toast.info(<div className="text-left"><p className="font-semibold mb-1">Install AgentApex:</p><p>Click the <strong>Install</strong> icon in the address bar</p></div>, { duration: 5000 });
    }
  };

  const dismissBanner = () => { setShowInstallBanner(false); localStorage.setItem('agentapex_install_dismissed', Date.now().toString()); };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, notifRes, reqRes] = await Promise.all([
          api().get('/stats'),
          api().get('/notifications/unread-count').catch(() => ({ data: { unread_count: 0 } })),
          api().get('/requirements').catch(() => ({ data: [] }))
        ]);
        setStats({ ...statsRes.data, requirements: Array.isArray(reqRes.data) ? reqRes.data.length : 0 });
        setUnreadNotifications(notifRes.data.unread_count || 0);
      } catch (error) { console.error('Error:', error); }
      setLoading(false);
    };
    fetchStats();
  }, [api]);

  const shareApp = async () => {
    const shareData = { title: 'AgentApex', text: 'Check out AgentApex! Best app for real estate agents.', url: window.location.origin + '/agentapex' };
    try {
      if (navigator.share) { await navigator.share(shareData); }
      else { await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`); toast.success('Link copied!'); }
    } catch (err) {
      if (err.name !== 'AbortError') { await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`); toast.success('Link copied!'); }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Install Banner */}
      {showInstallBanner && !isStandalone && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-[#1a365d] to-[#2c5282] text-white">
          {isIOS ? (
            <div className="px-4 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="w-5 h-5" />
                    <p className="font-bold text-base">Install AgentApex on iPhone</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2"><span className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-xs font-bold">1</span><span>Tap <Share2 className="inline w-4 h-4 mx-1" /> <strong>Share</strong> (bottom of Safari)</span></p>
                    <p className="flex items-center gap-2"><span className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-xs font-bold">2</span><span>Scroll down, tap <strong>"Add to Home Screen"</strong></span></p>
                    <p className="flex items-center gap-2"><span className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center text-xs font-bold">3</span><span>Tap <strong>Add</strong> (top right)</span></p>
                  </div>
                </div>
                <button onClick={dismissBanner} className="p-2 text-white/80 text-xl">&#10005;</button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Install AgentApex</p>
                    <p className="text-xs text-blue-200">Quick access from home screen</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={dismissBanner} className="px-2 py-1 text-sm text-white/70">&#10005;</button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={installApp} className="px-4 py-2 bg-white text-[#1a365d] text-sm font-bold rounded-xl">Install</motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="ios-header border-b border-gray-100 px-4 py-3 sticky top-0 z-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
              <img src="/agentapex-icon-192.png" alt="AgentApex" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-bold text-[#1a365d]" data-testid="app-title">AgentApex</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/agentapex/search-property')}
              data-testid="header-search-id"
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <Hash className="w-4 h-4 text-gray-500" />
            </button>
            <HelpButton screen="dashboard" />
            <div className="text-right ml-1">
              <p className="text-[10px] text-gray-400">Welcome back</p>
              <p className="text-sm font-semibold text-gray-900">{user?.name || user?.phone}</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Stats Grid - 2x2 */}
      <motion.div className="p-4" variants={containerVariants} initial="hidden" animate="show">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Building2} label="Properties"
            value={loading ? '-' : stats.properties}
            color="text-white" bgColor="bg-sky-500"
            onClick={() => navigate('/agentapex/my-properties')}
          />
          <StatCard
            icon={TrendingUp} label="Leads"
            value={loading ? '-' : stats.leads}
            color="text-white" bgColor="bg-emerald-500"
            onClick={() => navigate('/agentapex/leads')}
          />
          <StatCard
            icon={Users} label="Follow-ups"
            value={loading ? '-' : stats.followups}
            color="text-white" bgColor="bg-blue-500"
            onClick={() => navigate('/agentapex/followups')}
          />
          <StatCard
            icon={ClipboardList} label="Requirements"
            value={loading ? '-' : (stats.requirements || 0)}
            color="text-white" bgColor="bg-purple-500"
            onClick={() => navigate('/agentapex/requirements')}
          />
        </div>
      </motion.div>

      {/* Post Property CTA */}
      <motion.div className="px-4 mb-4" variants={itemVariants}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/agentapex/post')}
          data-testid="quick-post-btn"
          className="w-full bg-gradient-to-r from-[#2c5282] to-[#3182ce] rounded-2xl p-5 text-left shadow-xl shadow-blue-900/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg">Post Property</p>
              <p className="text-blue-200 text-sm">Sell your land or plot</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <PlusSquare className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* Menu List */}
      <motion.div className="bg-white rounded-t-3xl shadow-sm" variants={containerVariants}>
        <MenuItem
          icon={MapPin} iconColor="text-blue-600" iconBg="bg-blue-50"
          label="Map Search" sublabel="Find properties near you"
          onClick={() => navigate('/agentapex/search')}
        />
        <MenuItem
          icon={Building2} iconColor="text-sky-600" iconBg="bg-sky-50"
          label="My Properties" sublabel={`${stats.properties} listed`}
          onClick={() => navigate('/agentapex/my-properties')}
          badge={stats.properties > 0 ? stats.properties : null} badgeColor="bg-sky-500"
        />
        <MenuItem
          icon={Clock} iconColor="text-indigo-600" iconBg="bg-indigo-50"
          label="Follow-ups" sublabel="Manage your contacts"
          onClick={() => navigate('/agentapex/followups')}
          badge={stats.followups > 0 ? stats.followups : null} badgeColor="bg-indigo-500"
        />
        <MenuItem
          icon={MapPin} iconColor="text-rose-600" iconBg="bg-rose-50"
          label="Interest Areas" sublabel="Get alerts for new properties"
          onClick={() => navigate('/agentapex/interest-areas')}
        />
        <MenuItem
          icon={Heart} iconColor="text-pink-500" iconBg="bg-pink-50"
          label="Saved" sublabel="Your favorite properties"
          onClick={() => navigate('/agentapex/favorites')}
          badge={stats.favorites > 0 ? stats.favorites : null} badgeColor="bg-pink-500"
        />
        <MenuItem
          icon={Bell} iconColor="text-cyan-600" iconBg="bg-cyan-50"
          label="Notifications" sublabel="Property alerts & updates"
          onClick={() => navigate('/agentapex/notifications')}
          badge={unreadNotifications > 0 ? unreadNotifications : null} badgeColor="bg-cyan-500"
        />
        <MenuItem
          icon={FileText} iconColor="text-purple-600" iconBg="bg-purple-50"
          label="Requirements" sublabel="Post your property needs"
          onClick={() => navigate('/agentapex/requirements')}
        />
        <MenuItem
          icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50"
          label="Leads" sublabel="Track buyer enquiries"
          onClick={() => navigate('/agentapex/leads')}
          badge={stats.leads > 0 ? stats.leads : null} badgeColor="bg-emerald-500"
        />
        <MenuItem
          icon={Share2} iconColor="text-gray-600" iconBg="bg-gray-100"
          label="Share App" sublabel="Invite other agents"
          onClick={shareApp}
        />
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
