import React, { useState, useEffect, useCallback } from "react";
import {
  History, Loader2, Search, UserCheck, Clock, Building, LogIn, LogOut as LogOutIcon, RefreshCw
} from "lucide-react";
import SaaSAdminLayout from "../layouts/SaaSAdminLayout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function fmtTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = (new Date() - d) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function durationMins(start, end) {
  if (!start || !end) return null;
  try {
    const diff = Math.round((new Date(end) - new Date(start)) / 60000);
    return diff >= 0 ? diff : null;
  } catch { return null; }
}

export default function SaaSAdminImpersonationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const token = localStorage.getItem("token");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/impersonate/log?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setLogs((await r.json()).logs || []);
    } catch { /* noop */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l =>
    !search.trim() ||
    (l.target_tenant_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.target_user_phone || "").includes(search) ||
    (l.admin_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SaaSAdminLayout
      pageTitle="Login History"
      pageSubtitle="Every 'Login as Business' session — who, when, for how long."
      headerRight={
        <button onClick={load} className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-sky-300 text-sm font-semibold px-3 py-2 rounded-lg" data-testid="refresh-logs-btn">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      }
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by business, phone, or admin..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            data-testid="impersonate-search"
          />
        </div>

        {/* Table / list */}
        <div className="bg-white border border-gray-200/70 rounded-2xl overflow-hidden shadow-sm" data-testid="impersonate-logs">
          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <History className="w-10 h-10 text-sky-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">No impersonation sessions yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Use "Login as" on any business row to start your first session.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500">
                      <th className="px-4 py-2.5 font-medium">Admin</th>
                      <th className="px-4 py-2.5 font-medium">Business</th>
                      <th className="px-4 py-2.5 font-medium">Logged in as</th>
                      <th className="px-4 py-2.5 font-medium">Reason</th>
                      <th className="px-4 py-2.5 font-medium">Started</th>
                      <th className="px-4 py-2.5 font-medium">Ended</th>
                      <th className="px-4 py-2.5 font-medium text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l, i) => (
                      <tr key={l.id || i} className="border-t border-gray-100 hover:bg-gray-50/40" data-testid={`log-row-${i}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                              <UserCheck className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{l.admin_name || "Admin"}</p>
                              <p className="text-[10px] text-gray-400">{l.admin_phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-800 truncate max-w-[180px]">{l.target_tenant_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 text-xs">
                          {l.target_user_name || l.target_user_phone || "—"}
                          {l.target_user_phone && <div className="text-[10px] text-gray-400">{l.target_user_phone}</div>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs truncate max-w-[220px]">{l.reason || "—"}</td>
                        <td className="px-4 py-2.5 text-[11px] text-gray-500 whitespace-nowrap">{fmtTime(l.started_at)}</td>
                        <td className="px-4 py-2.5 text-[11px] text-gray-500 whitespace-nowrap">{l.ended_at ? fmtTime(l.ended_at) : <span className="text-emerald-600 font-semibold">Active</span>}</td>
                        <td className="px-4 py-2.5 text-right">
                          {l.ended_at ? (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                              <Clock className="w-2.5 h-2.5" /> {durationMins(l.started_at, l.ended_at) ?? "—"}m
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                              <LogIn className="w-2.5 h-2.5" /> Live
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map((l, i) => (
                  <div key={l.id || i} className="p-3 space-y-1" data-testid={`log-mobile-${i}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 text-sm truncate">{l.target_tenant_name || "—"}</span>
                      {l.ended_at ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                          <Clock className="w-2.5 h-2.5" /> {durationMins(l.started_at, l.ended_at) ?? "—"}m
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                          <LogIn className="w-2.5 h-2.5" /> Live
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">by {l.admin_name || l.admin_phone} · {fmtTime(l.started_at)}</p>
                    {l.reason && <p className="text-[10px] text-gray-400 italic truncate">"{l.reason}"</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </SaaSAdminLayout>
  );
}
