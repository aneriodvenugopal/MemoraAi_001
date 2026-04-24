import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, MessageSquare, CalendarDays, BarChart3, MoreHorizontal,
  Upload, Bell, Calendar, Megaphone, Eye, ShoppingBag,
  TrendingUp, ArrowUpRight, ArrowDownRight, Bot, ChevronRight,
  Star, Settings, Users, Phone, Clock, Flame, Brain, Globe, Shield,
  FileText, Sparkles, Send, Scissors, Stethoscope, Building,
  PartyPopper, Sprout, GraduationCap, CircleCheck, CircleX,
  AlertTriangle, Search, Plus, Filter, X
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ICONS = {
  real_estate: Building, astrology: Star, doctor_clinic: Stethoscope,
  function_hall: PartyPopper, pesticides_fertilizer: Sprout,
  beauty_salon: Scissors, coaching_center: GraduationCap,
};

export default function MobileOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashData, setDashData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [hotSales, setHotSales] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [catStats, setCatStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, aptToday, apts, hot, alertsRes, anal, tpls, cats] = await Promise.all([
        fetch(`${API}/analytics/dashboard`, { headers }).then(r => r.ok ? r.json() : {}),
        fetch(`${API}/memoraai/appointments/today/summary`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API}/memoraai/appointments?limit=10`, { headers }).then(r => r.ok ? r.json() : { appointments: [] }),
        fetch(`${API}/memoraai/sales/hot?status=active`, { headers }).then(r => r.ok ? r.json() : { hot_sales: [] }),
        fetch(`${API}/memoraai/sales/alerts?status=new`, { headers }).then(r => r.ok ? r.json() : { alerts: [] }),
        fetch(`${API}/memoraai/analytics/overview?period=week`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${API}/memoraai/templates`, { headers }).then(r => r.ok ? r.json() : { templates: [] }),
        fetch(`${API}/memoraai/dashboard/category-stats`, { headers }).then(r => r.ok ? r.json() : null),
      ]);
      setDashData(dash);
      setTodaySummary(aptToday);
      setAppointments(apts.appointments || []);
      setHotSales(hot.hot_sales || []);
      setAlerts(alertsRes.alerts || []);
      setAnalytics(anal);
      setTemplates(tpls.templates || []);
      setCatStats(cats);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const userName = user?.name || user?.email?.split('@')[0] || 'Owner';
  const catName = catStats?.category_name || 'Business';
  const CatIcon = CATEGORY_ICONS[catStats?.category] || Star;

  const overview = dashData?.overview || {};
  const totalChats = overview.total_leads || 0;
  const pendingReplies = alerts.length;
  const newBookings = todaySummary?.total || 0;
  const revenue = analytics?.revenue?.this_period || 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="mobile-owner-dashboard">
      {/* Content based on active tab */}
      {activeTab === 'dashboard' && (
        <DashboardTab
          userName={userName} catName={catName} CatIcon={CatIcon}
          totalChats={totalChats} pendingReplies={pendingReplies}
          newBookings={newBookings} revenue={revenue}
          hotSales={hotSales} alerts={alerts}
          catStats={catStats} navigate={navigate} loading={loading}
        />
      )}
      {activeTab === 'chats' && <ChatsTab navigate={navigate} hotSales={hotSales} alerts={alerts} headers={headers} />}
      {activeTab === 'bookings' && <BookingsTab appointments={appointments} todaySummary={todaySummary} navigate={navigate} headers={headers} fetchAll={fetchAll} />}
      {activeTab === 'reports' && <ReportsTab analytics={analytics} navigate={navigate} />}
      {activeTab === 'more' && <MoreTab navigate={navigate} catName={catName} templates={templates} />}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb" data-testid="bottom-nav">
        <div className="flex items-center justify-around py-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'chats', icon: MessageSquare, label: 'Chats', badge: pendingReplies },
            { id: 'bookings', icon: CalendarDays, label: 'Bookings' },
            { id: 'reports', icon: BarChart3, label: 'Reports' },
            { id: 'more', icon: MoreHorizontal, label: 'More' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors relative ${activeTab === tab.id ? 'text-sky-600' : 'text-gray-400'}`}
              data-testid={`nav-${tab.id}`}>
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}


/* ═══════════════ DASHBOARD TAB ═══════════════ */
function DashboardTab({ userName, catName, CatIcon, totalChats, pendingReplies, newBookings, revenue, hotSales, alerts, catStats, navigate, loading }) {
  return (
    <div className="space-y-5 pb-4" data-testid="dashboard-tab">
      {/* Premium greeting header */}
      <div className="bg-gradient-to-br from-sky-500 via-sky-400 to-blue-400 px-4 pt-5 pb-12 rounded-b-[28px] relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-4 w-32 h-32 bg-sky-600/20 rounded-full blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] text-sky-900/80 font-semibold uppercase tracking-widest">Welcome back</p>
            <h1 className="text-2xl font-bold text-white truncate drop-shadow-sm">Hi, {userName} 👋</h1>
            <p className="text-[11px] text-sky-50/90 mt-0.5">Here's what's happening today</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center shadow-md flex-shrink-0">
            <CatIcon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Lifted KPI grid (overlapping header) */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="grid grid-cols-2 gap-3" data-testid="kpi-cards">
          <KPICard label="Today Chats" value={totalChats} icon={MessageSquare} trend={18} color="bg-blue-50 text-blue-600" loading={loading} />
          <KPICard label="Pending Replies" value={pendingReplies} icon={Clock} trend={-8} color="bg-orange-50 text-orange-600" loading={loading} />
          <KPICard label="New Bookings" value={newBookings} icon={CalendarDays} trend={20} color="bg-green-50 text-green-600" loading={loading} />
          <KPICard label="Revenue" value={`Rs.${revenue.toLocaleString()}`} icon={TrendingUp} trend={22} color="bg-purple-50 text-purple-600" loading={loading} />
        </div>
      </div>

      <div className="px-4 space-y-5">

      {/* AI Auto Reply Card */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl p-4 border border-sky-100 flex items-center gap-4" data-testid="ai-auto-reply-card">
        <div className="w-12 h-12 bg-sky-400 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm">AI Auto Reply Active</h3>
          <p className="text-xs text-gray-500">MemoraAI is responding to customer messages with {catName} expertise</p>
        </div>
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3" data-testid="quick-actions">
          {[
            { icon: Upload, label: 'Content Library', onClick: () => navigate('/content-library') },
            { icon: Bell, label: 'Send Notification', onClick: () => navigate('/memoraai-templates') },
            { icon: Calendar, label: 'New Booking', onClick: () => navigate('/memoraai-appointments') },
            { icon: Megaphone, label: 'Broadcast', onClick: () => navigate('/memoraai-templates') },
            { icon: Eye, label: 'View Leads', onClick: () => navigate('/leads') },
            { icon: Flame, label: 'Hot Sales', onClick: () => navigate('/hot-sales') },
          ].map((a, i) => (
            <button key={i} onClick={a.onClick}
              className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-xl border border-gray-100 hover:border-sky-200 hover:shadow-md transition-all" data-testid={`action-${i}`}>
              <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center">
                <a.icon className="w-5 h-5 text-sky-600" />
              </div>
              <span className="text-[10px] text-gray-600 font-medium text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Widgets */}
      {catStats && catStats.widgets && catStats.widgets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{catStats.category_name} Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            {catStats.widgets.map((w, i) => (
              <div key={i} className="bg-white rounded-xl p-3 border border-gray-100" data-testid={`cat-widget-${i}`}>
                <p className="text-[10px] text-gray-400 font-medium">{w.label}</p>
                <p className="text-lg font-bold text-gray-900">{w.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hot Sales / Recent Alerts */}
      {(hotSales.length > 0 || alerts.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" /> Recent Activity
            </h3>
            <button onClick={() => navigate('/hot-sales')} className="text-xs text-sky-600 font-medium">View All</button>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 2).map(a => (
              <div key={a.id} className="bg-white rounded-xl p-3 border-l-4 border-l-red-400 border border-gray-100 flex items-center gap-3" data-testid={`alert-${a.id}`}>
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{a.customer_phone}</p>
                  <p className="text-[10px] text-gray-400 truncate">{a.trigger_message}</p>
                </div>
                <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">{Math.round(a.confidence * 100)}%</span>
              </div>
            ))}
            {hotSales.slice(0, 3).map(s => (
              <div key={s.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3" data-testid={`hot-${s.id}`}>
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">{s.customer_name || s.customer_phone}</p>
                  <p className="text-[10px] text-gray-400">{s.service_name || s.notes || 'Hot lead'}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                  {s.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}


/* ═══════════════ CHATS TAB ═══════════════ */
function ChatsTab({ navigate, hotSales, alerts, headers }) {
  const [leads, setLeads] = useState([]);
  useEffect(() => {
    fetch(`${API}/whatsapp-crm/leads?limit=20`, { headers }).then(r => r.ok ? r.json() : { leads: [] }).then(d => setLeads(d.leads || [])).catch(() => {});
  }, []);

  return (
    <div className="px-4 pt-4 space-y-4" data-testid="chats-tab">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Chats</h1>
        <button onClick={() => navigate('/whatsapp-crm')} className="text-xs text-sky-600 font-medium flex items-center gap-1">
          Open CRM <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-50 rounded-xl p-3 border border-red-100" data-testid="alerts-banner">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
            <Flame className="w-4 h-4" /> {alerts.length} buying intent alert{alerts.length > 1 ? 's' : ''} detected!
          </p>
          <button onClick={() => navigate('/hot-sales')} className="text-[10px] text-red-600 underline mt-1">View alerts</button>
        </div>
      )}

      {/* Recent Leads */}
      <div className="space-y-2">
        {leads.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No WhatsApp chats yet</p>
            <p className="text-xs text-gray-300">Leads from WhatsApp will appear here</p>
          </div>
        ) : leads.map((lead, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3 cursor-pointer hover:border-sky-200 transition-colors"
            onClick={() => navigate('/whatsapp-crm')} data-testid={`chat-lead-${i}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(lead.name || lead.phone || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{lead.name || lead.phone}</p>
              <p className="text-[10px] text-gray-400 truncate">{lead.last_message || 'WhatsApp lead'}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[9px] text-gray-400">{lead.score || ''}</p>
              {lead.unread > 0 && (
                <span className="inline-flex w-5 h-5 bg-green-500 text-white text-[9px] font-bold rounded-full items-center justify-center">{lead.unread}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════ BOOKINGS TAB ═══════════════ */
function BookingsTab({ appointments, todaySummary, navigate, headers, fetchAll }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  const markComplete = async (id) => {
    await fetch(`${API}/memoraai/appointments/${id}/complete`, { method: 'POST', headers });
    fetchAll();
  };

  return (
    <div className="px-4 pt-4 space-y-4" data-testid="bookings-tab">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Bookings / Orders</h1>
        <button onClick={() => navigate('/memoraai-appointments')} className="w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center" data-testid="add-booking-btn">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Status Summary */}
      {todaySummary && (
        <div className="grid grid-cols-4 gap-2" data-testid="booking-status-summary">
          {[
            { label: 'Upcoming', value: todaySummary.scheduled, color: 'bg-blue-50 text-blue-600 border-blue-200' },
            { label: 'Confirmed', value: todaySummary.completed, color: 'bg-green-50 text-green-600 border-green-200' },
            { label: 'Completed', value: todaySummary.completed, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
            { label: 'Cancelled', value: todaySummary.cancelled, color: 'bg-red-50 text-red-600 border-red-200' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-2 text-center border ${s.color}`} data-testid={`status-${s.label.toLowerCase()}`}>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[9px] font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {['all', 'scheduled', 'completed', 'cancelled', 'no_show'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`} data-testid={`booking-filter-${f}`}>
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
            <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No bookings found</p>
          </div>
        ) : filtered.map(apt => (
          <div key={apt.id} className="bg-white rounded-xl p-3 border border-gray-100" data-testid={`booking-${apt.id}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{apt.customer_name || apt.customer_phone}</p>
                  <p className="text-[10px] text-sky-600 font-medium">{apt.service_name}</p>
                </div>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : apt.status === 'completed' ? 'bg-green-100 text-green-700' : apt.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                {apt.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{apt.appointment_date}</span>
              {apt.appointment_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{apt.appointment_time}</span>}
              {apt.amount > 0 && <span className="font-medium text-gray-600">Rs.{apt.amount}</span>}
            </div>
            {apt.status === 'scheduled' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => markComplete(apt.id)} className="flex-1 bg-green-50 text-green-700 text-xs font-medium py-1.5 rounded-lg hover:bg-green-100 transition-colors" data-testid={`complete-booking-${apt.id}`}>
                  <CircleCheck className="w-3 h-3 inline mr-1" />Completed
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════ REPORTS TAB ═══════════════ */
function ReportsTab({ analytics, navigate }) {
  if (!analytics) return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Reports</h1>
      <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
        <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Loading analytics...</p>
      </div>
    </div>
  );

  const { appointments, revenue, customers, whatsapp, daily_trend, popular_services } = analytics;

  return (
    <div className="px-4 pt-4 space-y-4" data-testid="reports-tab">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <button onClick={() => navigate('/memoraai-analytics')} className="text-xs text-sky-600 font-medium flex items-center gap-1">
          Full Report <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard label="Total Chats" value={whatsapp?.total_leads || 0} icon={MessageSquare} trend={22} color="bg-blue-50 text-blue-600" />
        <KPICard label="Leads" value={whatsapp?.new_leads || 0} icon={Users} trend={18} color="bg-green-50 text-green-600" />
        <KPICard label="Bookings" value={appointments?.total || 0} icon={CalendarDays} trend={25} color="bg-purple-50 text-purple-600" />
        <KPICard label="Revenue" value={`Rs.${(revenue?.total || 0).toLocaleString()}`} icon={TrendingUp} trend={30} color="bg-sky-50 text-sky-600" />
      </div>

      {/* Mini Chart */}
      {daily_trend && daily_trend.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100" data-testid="trend-chart">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity (7 Days)</h3>
          <div className="flex items-end gap-2 h-24">
            {daily_trend.map((d, i) => {
              const maxVal = Math.max(...daily_trend.map(x => x.count), 1);
              const h = Math.max(8, (d.count / maxVal) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-medium text-gray-600">{d.count}</span>
                  <div className="w-full bg-gradient-to-t from-sky-500 to-blue-400 rounded-t-md" style={{ height: `${h}%` }} />
                  <span className="text-[8px] text-gray-400">{d.date.split(' ')[1]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Popular Services */}
      {popular_services && popular_services.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100" data-testid="popular-services">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Services</h3>
          <div className="space-y-2">
            {popular_services.slice(0, 4).map((s, i) => {
              const maxC = popular_services[0]?.count || 1;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-24 truncate">{s.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${(s.count / maxC) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 w-6 text-right">{s.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Metrics */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100" data-testid="customer-metrics">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Insights</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-sky-50 rounded-lg">
            <p className="text-lg font-bold text-sky-700">{customers?.unique || 0}</p>
            <p className="text-[9px] text-gray-500">Unique</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-700">{customers?.repeat || 0}</p>
            <p className="text-[9px] text-gray-500">Repeat</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <p className="text-lg font-bold text-purple-700">{customers?.retention_rate || 0}%</p>
            <p className="text-[9px] text-gray-500">Retention</p>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════ MORE TAB ═══════════════ */
function MoreTab({ navigate, catName, templates }) {
  const { user, logout } = useAuth();

  // Grouped sections with a premium dark/light hybrid feel
  const groups = [
    {
      title: 'AI & Automation',
      items: [
        { icon: Bot, label: 'WhatsApp Setup', sub: 'WABA configuration', onClick: () => navigate('/waba-setup') },
        { icon: Brain, label: 'AI Brain (Own GPT)', sub: 'Train AI with your content', onClick: () => navigate('/own-business-gpt') },
        { icon: MessageSquare, label: 'Team Inbox', sub: 'Live chats + handover', onClick: () => navigate('/team-inbox') },
        { icon: Brain, label: 'AI Memory', sub: 'RAG customer memory', onClick: () => navigate('/memoraai-appointments') },
        { icon: Brain, label: 'Chat Learning', sub: 'Teach AI from corrections', onClick: () => navigate('/chat-corrections') },
        { icon: Shield, label: 'Business Rules', sub: 'Control AI behavior', onClick: () => navigate('/business-rules') },
      ],
    },
    {
      title: 'Content & Services',
      items: [
        { icon: FileText, label: 'Content Library', sub: 'Brochures, images, videos', onClick: () => navigate('/content-library') },
        { icon: Send, label: 'Templates', sub: `${templates.length} templates`, onClick: () => navigate('/memoraai-templates') },
        { icon: Star, label: 'Category Setup', sub: 'Manage categories & services', onClick: () => navigate('/category-setup') },
        { icon: Globe, label: 'Industry Pages', sub: 'Manage landing pages', onClick: () => navigate('/admin-industries') },
      ],
    },
    {
      title: 'Sales & Growth',
      items: [
        { icon: Flame, label: 'Hot Sales Mode', sub: 'Manual entry & AI alerts', onClick: () => navigate('/hot-sales') },
        { icon: Calendar, label: 'Google Calendar Sync', sub: 'Auto-push appointments', onClick: () => navigate('/calendar-sync') },
        { icon: Building, label: 'Business Information', sub: catName, onClick: () => navigate('/category-setup') },
      ],
    },
    {
      title: 'Team & Settings',
      items: [
        { icon: Users, label: 'Staff & Permissions', sub: 'Manage team access', onClick: () => navigate('/settings/role-assignments') },
        { icon: Settings, label: 'Settings', sub: 'Account preferences', onClick: () => navigate('/settings') },
      ],
    },
  ];

  return (
    <div className="pb-6" data-testid="more-tab">
      {/* Premium dark profile header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-sky-950 px-4 pt-6 pb-14 rounded-b-[28px] relative overflow-hidden" data-testid="profile-card">
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-sky-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-gray-900 text-2xl font-bold shadow-xl shadow-sky-500/30 ring-2 ring-white/10">
            {(user?.name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-white text-lg truncate">{user?.name || 'Business Owner'}</h2>
            <p className="text-[11px] text-gray-400 truncate">{user?.phone || user?.email}</p>
            <span className="text-[10px] bg-sky-400/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
              {catName}
            </span>
          </div>
        </div>
      </div>

      {/* Lifted menu groups */}
      <div className="px-4 -mt-10 relative z-10 space-y-4">
        {groups.map((group, gi) => (
          <section key={gi} className="space-y-2" data-testid={`more-group-${gi}`}>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1.5">
              {group.title}
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-200/50 divide-y divide-gray-50 overflow-hidden">
              {group.items.map((s, i) => (
                <button
                  key={i}
                  onClick={s.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-sky-50/40 active:bg-sky-50 transition-colors text-left group"
                  data-testid={`more-item-${gi}-${i}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 flex items-center justify-center flex-shrink-0 group-hover:from-sky-100 group-hover:to-blue-100 transition-colors">
                    <s.icon className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                    {s.sub && <p className="text-[11px] text-gray-400 truncate">{s.sub}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-sky-500 transition-colors" />
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full bg-white border border-red-100 text-red-600 font-semibold text-sm py-3.5 rounded-2xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
          data-testid="logout-btn"
        >
          <X className="w-4 h-4" /> Logout
        </button>

        <p className="text-center text-[10px] text-gray-400 pt-2">MemoraAI &middot; v2.0</p>
      </div>
    </div>
  );
}


/* ═══════════════ SHARED COMPONENTS ═══════════════ */
function KPICard({ label, value, icon: Icon, trend, color, loading }) {
  const isPositive = trend >= 0;
  return (
    <div className={`rounded-2xl p-3.5 border border-gray-100 bg-white`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-xl ${color.split(' ')[0]} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color.split(' ')[1]}`} />
        </div>
        <div className={`flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <p className="text-lg font-bold text-gray-900">{loading ? '...' : value}</p>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
    </div>
  );
}
