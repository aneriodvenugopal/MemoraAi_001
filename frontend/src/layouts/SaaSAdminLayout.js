import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, LayoutDashboard, Building, Briefcase, History,
  BarChart3, Settings, LogOut, Menu, X, ArrowRightLeft, Sparkles,
  ChevronRight, Headphones
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Premium dark-navy sidebar layout for SaaS Admin console.
 * Mirrors `BusinessAdminLayout` styling so switching between "Platform Admin"
 * and "My Business" modes feels seamless.
 */
export default function SaaSAdminLayout({ children, pageTitle, pageSubtitle, headerRight }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [kpis, setKpis] = useState({ tenants: 0, impersonations: 0 });

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Light KPI badges for the sidebar
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/memoraai/saas-admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.overview) setKpis({ tenants: d.overview.total_tenants || 0, impersonations: 0 });
      })
      .catch(() => {});
  }, [location.pathname]);

  const menu = [
    { key: 'overview',     label: 'Overview',      icon: LayoutDashboard, path: '/saas-admin' },
    { key: 'tenants',      label: 'Businesses',    icon: Building,        path: '/saas-admin', hash: '#tenants', badge: kpis.tenants },
    { key: 'categories',   label: 'Categories',    icon: Briefcase,       path: '/saas-admin/categories' },
    { key: 'impersonate',  label: 'Login History', icon: History,         path: '/saas-admin/impersonation-logs' },
    { key: 'analytics',    label: 'Analytics',     icon: BarChart3,       path: '/saas-admin/analytics' },
    { key: 'settings',     label: 'Platform Settings', icon: Settings,    path: '/saas-admin/settings' },
  ];

  const isActive = (item) => {
    if (item.path === '/saas-admin' && item.key === 'overview') {
      return location.pathname === '/saas-admin' && !location.hash;
    }
    if (item.hash) {
      return location.pathname === item.path && location.hash === item.hash;
    }
    return location.pathname === item.path || (item.path !== '/saas-admin' && location.pathname.startsWith(item.path));
  };

  const handleNav = (item) => {
    if (item.hash) navigate(item.path + item.hash);
    else navigate(item.path);
  };

  const handleLogout = async () => {
    try { await logout?.(); } catch { /* noop */ }
    navigate('/login');
  };

  const goMyBusiness = () => {
    navigate(user?.tenant_id ? '/own-business-gpt' : '/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0b1120] text-white px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10" data-testid="saas-mobile-menu-btn">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-sm">SaaS Admin</span>
          </div>
        </div>
        {headerRight && <div className="flex items-center gap-1.5 scale-90">{headerRight}</div>}
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-[#0b1120] text-gray-200 flex flex-col transition-all duration-300 border-r border-white/5
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        data-testid="saas-admin-sidebar"
      >
        {/* Brand */}
        <div className="p-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src="/memoraai-logo.png" alt="MemoraAI" className="h-7 w-auto object-contain" />
            </div>
            {!collapsed && (
              <div>
                <p className="font-bold text-white text-lg leading-tight">Memora<span className="text-sky-400">AI</span></p>
                <p className="text-[10px] uppercase tracking-widest text-sky-300/70 font-semibold">Platform Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(c => !c)}
            className="p-1 text-gray-400 hover:text-white lg:block"
            data-testid="saas-sidebar-toggle"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Admin identity */}
        <div className={`px-5 py-3 border-b border-white/5 ${collapsed ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-md">
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-sky-300/80 truncate">{user?.phone || 'super_admin'}</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {menu.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item)}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                data-testid={`saas-sidebar-${item.key}`}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && item.badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-sky-500/30 text-sky-200'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Switch to own business + Logout */}
        <div className="px-3 py-3 space-y-2 border-t border-white/5">
          <button
            onClick={goMyBusiness}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all bg-gradient-to-br from-sky-600/20 to-blue-600/20 hover:from-sky-500/30 hover:to-blue-500/30 border border-sky-500/20 text-sky-200 ${collapsed ? 'justify-center' : ''}`}
            data-testid="switch-to-my-business-btn"
            title="Switch to my business dashboard"
          >
            <ArrowRightLeft className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">Switch to My Business</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-all ${collapsed ? 'justify-center' : ''}`}
            data-testid="saas-sidebar-logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="lg:hidden fixed inset-0 bg-black/50 z-30" />
      )}

      {/* Content area */}
      <div className="flex-1 min-w-0 lg:ml-0 pt-14 lg:pt-0">
        {/* Desktop page header */}
        {(pageTitle || headerRight) && (
          <header className="bg-white border-b border-gray-200/70 px-5 lg:px-8 py-4 hidden lg:block sticky top-0 z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                {pageTitle && <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-sky-600" />{pageTitle}</h1>}
                {pageSubtitle && <p className="text-xs text-gray-500 mt-0.5">{pageSubtitle}</p>}
              </div>
              {headerRight && <div className="flex items-center gap-2 flex-shrink-0">{headerRight}</div>}
            </div>
          </header>
        )}
        <main className="p-5 lg:p-8 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
