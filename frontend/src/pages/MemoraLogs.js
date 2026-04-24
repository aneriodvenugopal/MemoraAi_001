import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, MessageSquare, Brain, FileText, UserPlus, UserCog,
  Loader2, Search, RefreshCw
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const KIND_META = {
  ai:         { icon: MessageSquare, label: 'AI Chat',     cls: 'bg-sky-50 text-sky-600' },
  correction: { icon: Brain,         label: 'Learning',    cls: 'bg-purple-50 text-purple-600' },
  content:    { icon: FileText,      label: 'Knowledge',   cls: 'bg-blue-50 text-blue-600' },
  lead:       { icon: UserPlus,      label: 'Lead',        cls: 'bg-emerald-50 text-emerald-600' },
  staff:      { icon: UserCog,       label: 'Team',        cls: 'bg-orange-50 text-orange-600' },
};

const FILTERS = [
  { key: '',           label: 'All' },
  { key: 'ai',         label: 'AI Chats' },
  { key: 'correction', label: 'Learning' },
  { key: 'content',    label: 'Knowledge' },
  { key: 'lead',       label: 'Leads' },
  { key: 'staff',      label: 'Team' },
];

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export default function MemoraLogs() {
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const authOnly = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter ? `?kind=${filter}&limit=200` : '?limit=200';
      const r = await fetch(`${API}/memoraai/logs${qs}`, { headers: authOnly });
      if (r.ok) {
        const d = await r.json();
        setEvents(d.events || []);
        setCounts(d.counts || {});
      } else {
        setEvents([]);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter, token]);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter(e =>
    !search.trim() ||
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BusinessAdminLayout
      pageTitle="Activity Logs"
      pageSubtitle="A clean timeline of everything happening across your MemoraAI account."
      headerRight={
        <button
          onClick={load}
          className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-sky-300 text-sm font-semibold px-3 py-2 rounded-xl"
          data-testid="refresh-logs-btn"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      }
    >
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-4" data-testid="log-filters">
        {FILTERS.map(f => {
          const active = filter === f.key;
          const cnt = f.key ? counts[f.key] : Object.values(counts).reduce((a, b) => a + b, 0);
          return (
            <button
              key={f.key || 'all'}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                active
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-sky-300'
              }`}
              data-testid={`log-filter-${f.key || 'all'}`}
            >
              {f.label}
              {cnt > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold ${active ? 'text-white/80' : 'text-gray-400'}`}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search activity..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
          data-testid="logs-search"
        />
      </div>

      {/* Timeline */}
      <div className="bg-white border border-gray-200/70 rounded-3xl shadow-sm overflow-hidden" data-testid="logs-timeline">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto" />
            <p className="text-xs text-gray-500 mt-2">Loading activity...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
              <ScrollText className="w-7 h-7 text-sky-500" />
            </div>
            <h3 className="font-semibold text-gray-900">No activity yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              As customers chat, leads come in, and you train your AI — everything will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {filtered.map((e, i) => {
              const m = KIND_META[e.kind] || KIND_META.content;
              const Icon = m.icon;
              return (
                <li
                  key={`${e.kind}-${i}-${e.timestamp}`}
                  className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/60 transition-colors"
                  data-testid={`log-item-${e.kind}-${i}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${m.cls.split(' ')[0]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${m.cls.split(' ')[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{e.title}</p>
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md ${m.cls}`}>{m.label}</span>
                    </div>
                    {e.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{e.description}</p>
                    )}
                    {e.kind === 'correction' && e.meta?.applied_count > 0 && (
                      <p className="text-[10px] text-purple-600 font-semibold mt-1">
                        Applied {e.meta.applied_count} time{e.meta.applied_count > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0" data-testid={`log-time-${i}`}>
                    {formatTime(e.timestamp)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BusinessAdminLayout>
  );
}
