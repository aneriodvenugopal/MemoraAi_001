import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Brain, MessageSquare, Users, UserPlus, Megaphone, Workflow,
  Calendar, BarChart3, UserCog, Settings, Plug, Headphones,
  ChevronRight, CheckCircle2, Menu, X, Server, Sparkles, ScrollText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BusinessAdminLayout({ children, pageTitle, pageSubtitle, headerRight }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState({ conversations: 0, leads: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API}/memoraai/dashboard/summary`, { headers: h })
      .then(r => r.ok ? r.json() : {})
      .then(d => setCounts(c => ({ ...c, conversations: d?.pending_replies || d?.total_chats || 0 })))
      .catch(() => {});
  }, []);

  const menu = [
    { key: 'ai-brain',       label: 'AI Brain (GPT)', icon: Brain,        path: '/own-business-gpt' },
    { key: 'conversations',  label: 'Conversations',  icon: MessageSquare,path: '/team-inbox',         badge: counts.conversations },
    { key: 'leads',          label: 'Leads',          icon: UserPlus,     path: '/memoraai-leads',     badge: counts.leads },
    { key: 'contacts',       label: 'Contacts',       icon: Users,        path: '/memoraai-contacts' },
    { key: 'broadcast',      label: 'Broadcast',      icon: Megaphone,    path: '/memoraai-broadcast' },
    { key: 'automation',     label: 'Automation',     icon: Workflow,     path: '/memoraai-automation', tag: 'New' },
    { key: 'bookings',       label: 'Bookings',       icon: Calendar,     path: '/memoraai-appointments' },
    { key: 'analytics',      label: 'Analytics',      icon: BarChart3,    path: '/memoraai-analytics' },
    { key: 'team',           label: 'Staff Members',  icon: UserCog,      path: '/staff-members' },
    { key: 'settings',       label: 'Settings',       icon: Settings,     path: '/settings' },
    { key: 'integrations',   label: 'Integrations',   icon: Plug,         path: '/waba-setup' },
    { key: 'logs',           label: 'Logs',           icon: ScrollText,   path: '/memoraai-logs' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const SidebarContent = (
    <>
      {/* Top brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">Memora<span className="text-sky-400">AI</span></p>
            <p className="text-[10px] text-gray-400 leading-tight tracking-wide">WhatsApp Automation</p>
          </div>
        </div>
      </div>

      {/* Business profile */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="bg-white/5 rounded-2xl p-3 flex items-center gap-3" data-testid="sidebar-business-profile">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-md">
            {(user?.name || 'B')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-white text-sm truncate">{user?.name || 'Business'}</p>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            </div>
            <p className="text-[10px] text-gray-400">Business Plan · Active</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1" data-testid="sidebar-menu">
        {menu.map(item => {
          const active = isActive(item.path);
          return (
            <button
              key={item.key}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              data-testid={`sidebar-${item.key}`}
            >
              <item.icon className={`w-[18px] h-[18px] ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-sky-500/30 text-sky-200'}`}>
                  {item.badge}
                </span>
              )}
              {item.tag && !item.badge && (
                <span className="text-[9px] uppercase font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">{item.tag}</span>
              )}
              {active && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </nav>

      {/* Support card (fixed bottom) */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => window.open('https://wa.me/916309356590?text=' + encodeURIComponent('Hi, I need help with MemoraAI.'), '_blank')}
          className="w-full bg-gradient-to-br from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 rounded-2xl p-4 text-left transition-all shadow-lg shadow-sky-600/30"
          data-testid="sidebar-support-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">Need Help?</p>
              <p className="text-[11px] text-sky-200">Chat with Support</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sky-200" />
          </div>
        </button>
        <button onClick={logout} className="w-full mt-2 text-[11px] text-gray-500 hover:text-gray-300" data-testid="sidebar-logout">
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#fafbfd]" data-testid="business-admin-layout">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2" data-testid="mobile-sidebar-open">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-sky-600" />
          <span className="font-bold text-gray-900">MemoraAI</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" data-testid="mobile-sidebar-drawer">
          <div className="bg-black/60 flex-1" onClick={() => setMobileOpen(false)} />
          <aside className="w-[260px] bg-[#0a0e27] text-white flex flex-col max-h-screen overflow-hidden">
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 p-1.5 bg-white/10 rounded-md" data-testid="mobile-sidebar-close">
              <X className="w-4 h-4" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop layout */}
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-[260px] bg-[#0a0e27] text-white flex-col fixed inset-y-0 left-0 z-30" data-testid="desktop-sidebar">
          {SidebarContent}
        </aside>

        {/* Main */}
        <main className="flex-1 lg:pl-[260px] min-h-screen flex flex-col">
          {/* Page header */}
          {pageTitle && (
            <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-gray-200/70 px-5 lg:px-8 py-4 hidden lg:block">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900" data-testid="page-title">{pageTitle}</h1>
                    <span className="text-xs bg-gradient-to-r from-sky-500 to-blue-500 text-white px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Brain
                    </span>
                  </div>
                  {pageSubtitle && <p className="text-sm text-gray-500 mt-0.5">{pageSubtitle}</p>}
                </div>
                <div className="flex items-center gap-3">{headerRight}</div>
              </div>
            </header>
          )}

          <div className={`flex-1 ${pageTitle ? 'px-4 lg:px-8 py-5 lg:py-6' : ''}`}>
            {children}
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200 bg-white px-5 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500" data-testid="footer">
            <span>© 2026 MemoraAI</span>
            <div className="flex gap-4">
              <a href="/privacy-policy" className="hover:text-sky-600">Privacy</a>
              <a href="/terms-conditions" className="hover:text-sky-600">Terms</a>
              <a href="https://wa.me/916309356590" className="hover:text-sky-600">Support</a>
            </div>
            <span className="flex items-center gap-1.5">
              <Server className="w-3 h-3" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Server Status: Online
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
