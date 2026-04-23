import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building, Users, MessageSquare, Brain, Calendar,
  Flame, CheckCircle2, XCircle, Globe, BarChart3, LogIn,
  Search, ShieldCheck, TrendingUp, Zap, History
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LoginAsBusinessModal from "../components/LoginAsBusinessModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SaaSAdminDashboard() {
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loginAsTarget, setLoginAsTarget] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/memoraai/saas-admin/dashboard`, { headers });
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLoginAsSuccess = (payload) => {
    startImpersonation(
      payload.token,
      payload.user,
      { tenant_name: payload.impersonation?.tenant_name }
    );
    setLoginAsTarget(null);
    navigate('/dashboard', { replace: true });
    // Reload so every component picks up new token cleanly
    setTimeout(() => window.location.reload(), 50);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500 px-4 text-center" data-testid="access-denied">
      Access denied. Super admin only.
    </div>
  );

  const ov = data.overview;
  const filteredTenants = (data.tenants || []).filter(t =>
    !search.trim() || (t.name || "").toLowerCase().includes(search.toLowerCase())
    || (t.category_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50" data-testid="saas-admin-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/dashboard")}
            className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              SaaS Admin
            </h1>
            <p className="text-xs text-gray-500">MemoraAI Platform — manage all tenants</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="saas-kpis">
          <KPI icon={Building} label="Tenants" value={ov.total_tenants} />
          <KPI icon={Users} label="Users" value={ov.total_users} />
          <KPI icon={MessageSquare} label="Chats" value={ov.total_conversations} />
          <KPI icon={Brain} label="Memories" value={ov.total_memories} />
          <KPI icon={Calendar} label="Bookings" value={ov.total_appointments} />
          <KPI icon={Flame} label="Hot Sales" value={ov.total_hot_sales} />
        </div>

        {/* Activity Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActivityCard icon={Zap} label="Messages Today" value={ov.messages_today} color="emerald" />
          <ActivityCard icon={TrendingUp} label="Messages This Week" value={ov.messages_week} color="blue" />
          <ActivityCard icon={CheckCircle2} label="WABA Active / Pending" value={`${ov.waba_configured} / ${ov.waba_pending}`} color="amber" />
        </div>

        {/* Tenants Table */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden" data-testid="tenants-table">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">
              Registered Businesses ({filteredTenants.length})
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or category"
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-64"
                data-testid="tenant-search-input"
              />
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Business</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium text-center">Users</th>
                  <th className="px-4 py-2.5 font-medium text-center">Chats</th>
                  <th className="px-4 py-2.5 font-medium text-center">Services</th>
                  <th className="px-4 py-2.5 font-medium text-center">WABA</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400 text-sm">No businesses found.</td></tr>
                ) : filteredTenants.map(t => (
                  <tr key={t.id} className="border-t border-gray-50 hover:bg-amber-50/30" data-testid={`tenant-row-${t.id}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-[10px]">
                          {(t.name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[220px]">{t.name || 'Unnamed'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{t.category_name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-700">{t.users}</td>
                    <td className="px-4 py-2.5 text-center text-gray-700">{t.conversations}</td>
                    <td className="px-4 py-2.5 text-center text-gray-700">{t.services}</td>
                    <td className="px-4 py-2.5 text-center">
                      {t.waba_active
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setLoginAsTarget(t)}
                        className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        data-testid={`login-as-btn-${t.id}`}
                      >
                        <LogIn className="w-3 h-3" /> Login as
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filteredTenants.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No businesses found.</div>
            ) : filteredTenants.map(t => (
              <div key={t.id} className="p-3 flex items-center gap-3" data-testid={`tenant-card-${t.id}`}>
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                  {(t.name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{t.name || 'Unnamed'}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                    <span>{t.category_name}</span>
                    <span>·</span>
                    <span>{t.users} users</span>
                    <span>·</span>
                    <span>{t.conversations} chats</span>
                    {t.waba_active && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                  </div>
                </div>
                <button
                  onClick={() => setLoginAsTarget(t)}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                  data-testid={`login-as-btn-mobile-${t.id}`}
                >
                  <LogIn className="w-3 h-3" /> Login
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Admin Links */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform Tools</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="admin-links">
            {[
              { label: "Industry Pages", icon: Globe, path: "/admin-industries" },
              { label: "Team Inbox", icon: MessageSquare, path: "/team-inbox" },
              { label: "Analytics", icon: BarChart3, path: "/memoraai-analytics" },
              { label: "Impersonation Log", icon: History, path: "/saas-admin/impersonation-log" },
            ].map((l, i) => (
              <button
                key={i}
                onClick={() => navigate(l.path)}
                className="flex flex-col items-center gap-1.5 bg-white border border-gray-100 rounded-xl py-3 px-2 hover:border-amber-200 hover:shadow-sm transition-all"
                data-testid={`admin-link-${i}`}
              >
                <l.icon className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-medium text-gray-700">{l.label}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {loginAsTarget && (
        <LoginAsBusinessModal
          tenant={loginAsTarget}
          adminToken={token}
          onClose={() => setLoginAsTarget(null)}
          onSuccess={handleLoginAsSuccess}
        />
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-1.5">
        <Icon className="w-4 h-4 text-amber-600" />
      </div>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value ?? 0}</p>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function ActivityCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  const cls = colorMap[color] || colorMap.amber;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${cls.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${cls.split(' ')[1]}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
      </div>
    </div>
  );
}
