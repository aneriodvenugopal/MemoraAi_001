import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building, Users, MessageSquare, Brain, Calendar,
  Flame, CheckCircle2, XCircle, Globe, BarChart3, LogIn,
  Search, ShieldCheck, TrendingUp, Zap, History, Plus, Edit3, Key
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import SaaSAdminLayout from "../layouts/SaaSAdminLayout";
import LoginAsBusinessModal from "../components/LoginAsBusinessModal";
import OnboardBusinessWizard from "../components/OnboardBusinessWizard";
import EditBusinessModal from "../components/EditBusinessModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SaaSAdminDashboard() {
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loginAsTarget, setLoginAsTarget] = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
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
    <SaaSAdminLayout
      pageTitle="Overview"
      pageSubtitle="MemoraAI Platform — manage all tenants, categories, and platform health"
    >
      <div data-testid="saas-admin-dashboard" className="space-y-5">
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
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or category"
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 w-full sm:w-64"
                  data-testid="tenant-search-input"
                />
              </div>
              <button
                onClick={() => setShowOnboard(true)}
                className="flex items-center gap-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md shadow-sky-600/30 whitespace-nowrap"
                data-testid="register-business-btn"
              >
                <Plus className="w-3.5 h-3.5" /> Register Business
              </button>
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
                  <tr><td colSpan="7" className="px-4 py-10 text-center">
                    <div className="inline-flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center">
                        <Building className="w-7 h-7 text-sky-500" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">No businesses yet</p>
                      <p className="text-xs text-gray-500 max-w-sm">Start by registering your first business (e.g., your own agency). Takes ~60 seconds.</p>
                      <button onClick={() => setShowOnboard(true)} className="mt-1 inline-flex items-center gap-1 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg" data-testid="register-first-btn">
                        <Plus className="w-3 h-3" /> Register Business
                      </button>
                    </div>
                  </td></tr>
                ) : filteredTenants.map(t => (
                  <tr key={t.id} className="border-t border-gray-50 hover:bg-sky-50/30" data-testid={`tenant-row-${t.id}`}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-[10px]">
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditTarget(t)}
                          className="inline-flex items-center gap-1 bg-white border border-gray-200 hover:border-sky-300 text-gray-700 hover:text-sky-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                          data-testid={`edit-btn-${t.id}`}
                          title="Edit business profile & WABA credentials"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => setLoginAsTarget(t)}
                          className="inline-flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                          data-testid={`login-as-btn-${t.id}`}
                        >
                          <LogIn className="w-3 h-3" /> Login as
                        </button>
                      </div>
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
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditTarget(t)}
                    className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-sky-700 rounded-lg"
                    data-testid={`edit-btn-mobile-${t.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setLoginAsTarget(t)}
                    className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                    data-testid={`login-as-btn-mobile-${t.id}`}
                  >
                    <LogIn className="w-3 h-3" /> Login
                  </button>
                </div>
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
                className="flex flex-col items-center gap-1.5 bg-white border border-gray-100 rounded-xl py-3 px-2 hover:border-sky-200 hover:shadow-sm transition-all"
                data-testid={`admin-link-${i}`}
              >
                <l.icon className="w-5 h-5 text-sky-600" />
                <span className="text-xs font-medium text-gray-700">{l.label}</span>
              </button>
            ))}
          </div>
        </section>

      {loginAsTarget && (
        <LoginAsBusinessModal
          tenant={loginAsTarget}
          adminToken={token}
          onClose={() => setLoginAsTarget(null)}
          onSuccess={handleLoginAsSuccess}
        />
      )}

      {showOnboard && (
        <OnboardBusinessWizard
          onClose={() => setShowOnboard(false)}
          onSuccess={() => { fetchData(); showToast('success', 'Business onboarded successfully'); }}
        />
      )}

      {editTarget && (
        <EditBusinessModal
          tenant={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchData(); showToast('success', 'Business updated'); }}
        />
      )}

      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`} data-testid={`toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
      </div>
    </SaaSAdminLayout>
  );
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center mb-1.5">
        <Icon className="w-4 h-4 text-sky-600" />
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
    amber: 'bg-sky-50 text-sky-600',
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
