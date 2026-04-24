import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Building, MessageSquare, TrendingUp, Users, IndianRupee,
  Loader2, RefreshCw, Target, Award, Calendar
} from "lucide-react";
import SaaSAdminLayout from "../layouts/SaaSAdminLayout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SaaSAdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setData(await r.json());
    } catch { /* noop */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return (
      <SaaSAdminLayout pageTitle="Platform Analytics">
        <div className="py-20 text-center">
          <Loader2 className="w-7 h-7 text-sky-500 animate-spin mx-auto" />
        </div>
      </SaaSAdminLayout>
    );
  }

  const t = data.totals || {};
  const maxGrowth = Math.max(1, ...(data.growth || []).map(g => g.count));
  const maxCat = Math.max(1, ...(data.category_distribution || []).map(c => c.count));

  return (
    <SaaSAdminLayout
      pageTitle="Platform Analytics"
      pageSubtitle="Growth, activation funnel, and revenue across every business on MemoraAI."
      headerRight={
        <button onClick={load} className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-sky-300 text-sm font-semibold px-3 py-2 rounded-lg" data-testid="analytics-refresh">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      }
    >
      <div className="space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="analytics-kpis">
          <StatCard icon={Building} label="Total Tenants" value={t.tenants} accent="sky" />
          <StatCard icon={MessageSquare} label="Messages This Week" value={t.msgs_week} accent="blue" />
          <StatCard icon={Calendar} label="Messages Today" value={t.msgs_today} accent="emerald" />
          <StatCard icon={IndianRupee} label="Est. MRR" value={`Rs.${(t.estimated_mrr || 0).toLocaleString("en-IN")}`} accent="amber" hero />
        </div>

        {/* Funnel */}
        <Section title="Activation Funnel" icon={Target}>
          <div className="space-y-2" data-testid="analytics-funnel">
            {(data.activation_funnel || []).map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-gray-600 w-32 flex-shrink-0">{s.label}</span>
                <div className="flex-1 relative h-7 bg-gray-100 rounded-lg overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-blue-500 transition-all" style={{ width: `${s.pct}%` }} />
                  <span className="relative z-10 px-2 text-[11px] font-bold text-white leading-7">{s.count} ({s.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Growth + Plans row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Tenant Growth (8 weeks)" icon={TrendingUp}>
            <div className="flex items-end gap-1.5 h-40 px-2" data-testid="analytics-growth">
              {(data.growth || []).map((g, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">{g.count}</span>
                  <div
                    className="w-full bg-gradient-to-t from-sky-600 to-blue-400 rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${(g.count / maxGrowth) * 100}%`, minHeight: g.count > 0 ? "6px" : "2px" }}
                    title={`${g.label}: ${g.count} tenants`}
                  />
                  <span className="text-[9px] text-gray-500 truncate w-full text-center">{g.label}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Plan Distribution" icon={IndianRupee}>
            <div className="space-y-1.5" data-testid="analytics-plans">
              {(data.plan_distribution || []).length === 0 ? (
                <p className="text-xs text-gray-400">No data</p>
              ) : (
                (data.plan_distribution || []).map(p => (
                  <div key={p.plan} className="flex items-center gap-3 text-sm">
                    <span className="text-xs font-semibold text-gray-700 w-20 capitalize">{p.plan}</span>
                    <span className="flex-1 text-right text-gray-500 text-xs">{p.count} tenants × Rs.{p.price}</span>
                    <span className="font-bold text-gray-900 text-sm w-20 text-right">Rs.{(p.count * p.price).toLocaleString("en-IN")}</span>
                  </div>
                ))
              )}
            </div>
          </Section>
        </div>

        {/* Top tenants + Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Most Active Businesses" icon={Award}>
            <ul className="space-y-1.5" data-testid="analytics-top-tenants">
              {(data.top_tenants || []).length === 0 ? (
                <li className="text-xs text-gray-400 italic py-2">No conversations yet</li>
              ) : (
                (data.top_tenants || []).map((tn, i) => (
                  <li key={tn.tenant_id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="flex-1 truncate text-gray-800">{tn.name}</span>
                    <span className="text-xs font-semibold text-sky-700">{tn.conversations} chats</span>
                  </li>
                ))
              )}
            </ul>
          </Section>

          <Section title="Categories by Tenant Count" icon={Building}>
            <div className="space-y-1.5" data-testid="analytics-categories">
              {(data.category_distribution || []).length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No categories yet</p>
              ) : (
                (data.category_distribution || []).map(c => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 w-32 truncate">{c.name}</span>
                    <div className="flex-1 relative h-5 bg-gray-100 rounded">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-blue-500 rounded" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-8 text-right">{c.count}</span>
                  </div>
                ))
              )}
            </div>
          </Section>
        </div>

        <p className="text-[10px] text-gray-400 text-right">Generated {new Date(data.generated_at).toLocaleString()}</p>
      </div>
    </SaaSAdminLayout>
  );
}

function StatCard({ icon: Icon, label, value, accent, hero }) {
  const map = {
    sky: "from-sky-50 to-sky-100 text-sky-700",
    blue: "from-blue-50 to-blue-100 text-blue-700",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700",
    amber: "from-amber-50 to-amber-100 text-amber-700",
  };
  const cls = map[accent] || map.sky;
  return (
    <div className={`rounded-2xl p-4 border border-gray-200/70 ${hero ? "bg-gradient-to-br from-sky-600 to-blue-600 text-white" : "bg-white"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${hero ? "bg-white/15 text-white" : `bg-gradient-to-br ${cls}`}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className={`text-2xl font-bold leading-tight ${hero ? "text-white" : "text-gray-900"}`}>{value ?? 0}</p>
      <p className={`text-[10px] font-medium uppercase tracking-widest mt-0.5 ${hero ? "text-sky-100" : "text-gray-400"}`}>{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200/70 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-sky-600" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}
