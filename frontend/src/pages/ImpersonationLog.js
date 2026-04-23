import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, History, User, Building, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ImpersonationLog() {
  const navigate = useNavigate();
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLog = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const r = await fetch(`${API}/memoraai/saas-admin/impersonate/log?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        setLog(data.log || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const fmt = (iso) => iso ? new Date(iso).toLocaleString() : "—";

  return (
    <div className="min-h-screen bg-gray-50" data-testid="impersonation-log-page">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-sky-600" />
              Impersonation Audit Log
            </h1>
            <p className="text-xs text-gray-500">Every "Login as Business" session is recorded here</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto" />
          </div>
        ) : log.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100" data-testid="log-empty">
            <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No impersonation sessions yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50" data-testid="log-list">
            {log.map((entry, i) => (
              <div key={entry.id || i} className="p-3 flex items-start gap-3" data-testid={`log-entry-${i}`}>
                <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-sky-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {entry.admin_email || entry.admin_user_id}
                    <span className="text-gray-400 font-normal mx-1">acted as</span>
                    <span className="text-sky-700 inline-flex items-center gap-1">
                      <Building className="w-3 h-3" /> {entry.tenant_name || entry.tenant_id}
                    </span>
                  </p>
                  <div className="text-[11px] text-gray-500 mt-0.5 space-x-3">
                    <span>Started: {fmt(entry.started_at)}</span>
                    {entry.ended_at
                      ? <span>Ended: {fmt(entry.ended_at)}</span>
                      : <span className="text-green-600 font-medium">Session still active</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
