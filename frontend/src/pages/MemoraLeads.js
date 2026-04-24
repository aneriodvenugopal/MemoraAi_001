import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Phone, Search, Loader2, Clock, TrendingUp
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_BADGES = {
  new:        { bg: 'bg-violet-100',   text: 'text-violet-700',  label: 'New' },
  contacted:  { bg: 'bg-blue-100',     text: 'text-blue-700',    label: 'Contacted' },
  qualified:  { bg: 'bg-emerald-100',  text: 'text-emerald-700', label: 'Qualified' },
  closed:     { bg: 'bg-gray-100',     text: 'text-gray-600',    label: 'Closed' },
  lost:       { bg: 'bg-rose-100',     text: 'text-rose-700',    label: 'Lost' },
};

export default function MemoraLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const r = await fetch(`${API}/memoraai/public/leads/admin/list${params}`, { headers });
      if (r.ok) setLeads((await r.json()).leads || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter, token]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    await fetch(`${API}/memoraai/public/leads/admin/${id}/status`, {
      method: 'PUT', headers, body: JSON.stringify({ status }),
    });
    load();
  };

  const filtered = leads.filter(l =>
    !search.trim() ||
    (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.phone || '').includes(search) ||
    (l.business_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new' || !l.status).length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
  };

  return (
    <BusinessAdminLayout pageTitle="Leads" pageSubtitle="Interested customers from your website, WhatsApp, and campaigns.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="leads-stats">
        <StatCard label="Total Leads" value={stats.total} color="violet" icon={UserPlus} />
        <StatCard label="New" value={stats.new} color="blue" icon={Clock} />
        <StatCard label="Contacted" value={stats.contacted} color="sky" icon={Phone} />
        <StatCard label="Qualified" value={stats.qualified} color="emerald" icon={TrendingUp} />
      </div>

      <div className="bg-white border border-gray-200/70 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, business..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              data-testid="leads-search"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['', 'new', 'contacted', 'qualified', 'closed'].map(s => (
              <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                className={`whitespace-nowrap text-xs font-medium px-3 py-2 rounded-lg transition-colors ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                data-testid={`filter-${s || 'all'}`}>
                {s ? STATUS_BADGES[s]?.label : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="font-semibold text-gray-900">No leads yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Leads from your marketing site demo form will appear here instantly.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50" data-testid="leads-list">
            {filtered.map(l => {
              const st = STATUS_BADGES[l.status || 'new'];
              return (
                <div key={l.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50" data-testid={`lead-row-${l.id}`}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0">
                    {(l.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{l.name || 'Unknown'}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {l.phone} · {l.business_name || l.industry || 'Business unknown'}
                    </p>
                  </div>
                  <a href={`https://wa.me/91${(l.phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent('Hi ' + (l.name || '') + ', following up on your MemoraAI demo request.')}`}
                    target="_blank" rel="noreferrer"
                    className="p-2 rounded-lg hover:bg-green-50 text-[#25D366] hidden sm:inline-flex" data-testid={`lead-wa-${l.id}`}>
                    <Phone className="w-4 h-4" />
                  </a>
                  <select value={l.status || 'new'} onChange={e => updateStatus(l.id, e.target.value)}
                    className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 bg-white hover:border-violet-300 flex-shrink-0" data-testid={`lead-status-${l.id}`}>
                    {Object.entries(STATUS_BADGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BusinessAdminLayout>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  const cls = {
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-blue-50 text-blue-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${cls.split(' ')[0]} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${cls.split(' ')[1]}`} />
        </div>
      </div>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
    </div>
  );
}
