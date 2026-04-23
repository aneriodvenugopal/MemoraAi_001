import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, CheckCircle2, XCircle, ArrowLeft, ExternalLink,
  Link2, Link2Off, AlertTriangle, RefreshCw, Loader2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CalendarSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/memoraai/calendar/status`, { headers });
      if (r.ok) setStatus(await r.json());
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchUpcoming = useCallback(async () => {
    try {
      const r = await fetch(`${API}/memoraai/calendar/upcoming?limit=10`, { headers });
      if (r.ok) {
        const data = await r.json();
        setUpcoming(data.events || []);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await fetchStatus();
    await fetchUpcoming();
    setLoading(false);
  }, [fetchStatus, fetchUpcoming]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Handle redirect back from Google
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('connected') === 'true') {
      showToast('success', 'Google Calendar connected successfully!');
      // Clean URL
      window.history.replaceState({}, '', location.pathname);
      loadAll();
    } else if (params.get('error')) {
      showToast('error', `Connection failed: ${params.get('error').replace(/_/g, ' ')}`);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location, loadAll]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/memoraai/calendar/connect`, { headers });
      if (r.ok) {
        const data = await r.json();
        window.location.href = data.authorization_url;
      } else {
        const err = await r.json().catch(() => ({}));
        showToast('error', err.detail || 'Failed to start Google sign-in');
      }
    } catch (e) {
      showToast('error', 'Network error');
    } finally { setBusy(false); }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Calendar? New appointments will no longer be synced.')) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/memoraai/calendar/disconnect`, { method: 'POST', headers });
      if (r.ok) {
        showToast('success', 'Google Calendar disconnected');
        await loadAll();
      } else {
        showToast('error', 'Failed to disconnect');
      }
    } finally { setBusy(false); }
  };

  const isConfigured = status?.configured;
  const isConnected = status?.connected;

  return (
    <div className="min-h-screen bg-gray-50 pb-10" data-testid="calendar-sync-page">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-30">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Google Calendar Sync
            </h1>
            <p className="text-xs text-gray-500">Auto-push appointments to your Google Calendar</p>
          </div>
          <button onClick={loadAll} disabled={loading} className="p-2 text-gray-500 hover:text-amber-600" data-testid="refresh-btn">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`} data-testid={`toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {loading && !status ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-3">Loading...</p>
          </div>
        ) : (
          <>
            {/* Not configured banner */}
            {!isConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3" data-testid="not-configured-banner">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 text-sm">Google Calendar not configured yet</h3>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Your admin needs to add <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and
                    <code className="bg-amber-100 px-1 rounded ml-1">GOOGLE_CLIENT_SECRET</code> in the server .env file.
                    Once added, business owners will be able to connect their Google accounts here.
                  </p>
                </div>
              </div>
            )}

            {/* Connection Card */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm" data-testid="connection-card">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isConnected ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {isConnected
                    ? <CheckCircle2 className="w-7 h-7 text-green-600" data-testid="connected-icon" />
                    : <Calendar className="w-7 h-7 text-gray-400" data-testid="disconnected-icon" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900">
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </h2>
                  {isConnected && status?.google_email && (
                    <p className="text-xs text-gray-500 truncate" data-testid="google-email">
                      {status.google_email}
                    </p>
                  )}
                  {!isConnected && (
                    <p className="text-xs text-gray-500">
                      Connect your Google account to auto-sync all MemoraAI appointments.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                {isConnected ? (
                  <button
                    onClick={handleDisconnect}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-medium py-2.5 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                    data-testid="disconnect-btn"
                  >
                    <Link2Off className="w-4 h-4" />
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={busy || !isConfigured}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white font-medium py-2.5 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="connect-btn"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Connect Google Calendar
                  </button>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100" data-testid="how-it-works">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">How it works</h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex gap-2"><span className="text-amber-600">1.</span> Connect once — we store secure OAuth tokens, never your password.</li>
                <li className="flex gap-2"><span className="text-amber-600">2.</span> Every new appointment (dashboard or WhatsApp AI booking) auto-creates a Google Calendar event.</li>
                <li className="flex gap-2"><span className="text-amber-600">3.</span> Deleted MemoraAI appointments are also removed from Google Calendar.</li>
                <li className="flex gap-2"><span className="text-amber-600">4.</span> Disconnect anytime — your existing events stay, future ones stop syncing.</li>
              </ul>
            </div>

            {/* Upcoming events */}
            {isConnected && (
              <div className="bg-white rounded-2xl p-5 border border-gray-100" data-testid="upcoming-events">
                <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center justify-between">
                  Upcoming in Google Calendar
                  <span className="text-[10px] font-normal text-gray-400">{upcoming.length} events</span>
                </h3>
                {upcoming.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No upcoming events</p>
                ) : (
                  <ul className="space-y-2">
                    {upcoming.map(ev => (
                      <li key={ev.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg" data-testid={`event-${ev.id}`}>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{ev.summary || 'Untitled'}</p>
                          <p className="text-[10px] text-gray-500">{new Date(ev.start).toLocaleString()}</p>
                        </div>
                        {ev.link && (
                          <a href={ev.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-amber-600" data-testid={`event-link-${ev.id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
