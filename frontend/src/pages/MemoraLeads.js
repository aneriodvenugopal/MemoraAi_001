import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Phone, Search, Loader2, Clock, TrendingUp, Plus, X, Save, Trash2
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_BADGES = {
  new:        { bg: 'bg-sky-100',   text: 'text-sky-700',  label: 'New' },
  contacted:  { bg: 'bg-blue-100',     text: 'text-blue-700',    label: 'Contacted' },
  qualified:  { bg: 'bg-emerald-100',  text: 'text-emerald-700', label: 'Qualified' },
  closed:     { bg: 'bg-gray-100',     text: 'text-gray-600',    label: 'Closed' },
  lost:       { bg: 'bg-rose-100',     text: 'text-rose-700',    label: 'Lost' },
};

const SOURCES = [
  { key: 'manual',    label: 'Manual Entry' },
  { key: 'whatsapp',  label: 'WhatsApp Chat' },
  { key: 'website',   label: 'Website Demo Form' },
  { key: 'walkin',    label: 'Walk-in Customer' },
  { key: 'phone_call',label: 'Phone Call' },
  { key: 'facebook',  label: 'Facebook Ad' },
  { key: 'instagram', label: 'Instagram Ad' },
  { key: 'google_ads',label: 'Google Ads' },
  { key: 'referral',  label: 'Customer Referral' },
  { key: 'justdial',  label: 'Justdial / IndiaMART' },
  { key: 'other',     label: 'Other' },
];

export default function MemoraLeads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const authOnly = { Authorization: `Bearer ${token}` };

  const showToast = (type, msg) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Combine tenant-created leads + public marketing leads (for super admin)
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const [tenantR, marketingR] = await Promise.all([
        fetch(`${API}/memoraai/crm/leads${params}`, { headers: authOnly }).then(r => r.ok ? r.json() : { leads: [] }),
        fetch(`${API}/memoraai/public/leads/admin/list${params}`, { headers: authOnly })
          .then(r => r.ok ? r.json() : { leads: [] }),
      ]);
      const combined = [
        ...(tenantR.leads || []).map(l => ({ ...l, origin: 'tenant' })),
        ...(marketingR.leads || []).map(l => ({ ...l, origin: 'marketing', source: l.source || 'website' })),
      ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setLeads(combined);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter, token]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (lead, status) => {
    if (lead.origin === 'marketing') {
      await fetch(`${API}/memoraai/public/leads/admin/${lead.id}/status`, {
        method: 'PUT', headers, body: JSON.stringify({ status }),
      });
    } else {
      await fetch(`${API}/memoraai/crm/leads/${lead.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ status }),
      });
    }
    load();
  };

  const deleteLead = async (lead) => {
    if (!window.confirm('Delete this lead?')) return;
    if (lead.origin === 'tenant') {
      const r = await fetch(`${API}/memoraai/crm/leads/${lead.id}`, { method: 'DELETE', headers: authOnly });
      if (r.ok) { showToast('success', 'Lead deleted'); load(); }
    }
  };

  const filtered = leads.filter(l =>
    !search.trim() ||
    (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.phone || '').includes(search) ||
    (l.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: leads.length,
    new: leads.filter(l => (l.status || 'new') === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
  };

  return (
    <BusinessAdminLayout pageTitle="Leads" pageSubtitle="Interested customers from every source — website, WhatsApp, walk-ins, ads."
      headerRight={
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-sky-600/30"
          data-testid="new-lead-btn">
          <Plus className="w-4 h-4" /> New Lead
        </button>
      }>
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="leads-stats">
        <StatCard label="Total Leads" value={stats.total} color="sky" icon={UserPlus} />
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
              placeholder="Search by name, phone, description..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              data-testid="leads-search"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['', 'new', 'contacted', 'qualified', 'closed'].map(s => (
              <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                className={`whitespace-nowrap text-xs font-medium px-3 py-2 rounded-lg transition-colors ${statusFilter === s ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {s ? STATUS_BADGES[s]?.label : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-7 h-7 text-sky-500" />
            </div>
            <h3 className="font-semibold text-gray-900">No leads yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-3">Add your first lead manually, or leads from your website demo form will appear here instantly.</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg">
              <Plus className="w-3 h-3" /> Add Lead
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50" data-testid="leads-list">
            {filtered.map(l => {
              const st = STATUS_BADGES[l.status || 'new'];
              const sourceLabel = SOURCES.find(s => s.key === l.source)?.label || l.source || 'Unknown';
              return (
                <div key={l.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/50 group" data-testid={`lead-row-${l.id}`}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white font-bold flex items-center justify-center flex-shrink-0">
                    {(l.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{l.name || 'Unknown'}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{sourceLabel}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{l.phone}{l.service_interest ? ` · ${l.service_interest}` : ''}</p>
                    {l.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{l.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={`https://wa.me/91${(l.phone || '').replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer"
                      className="p-2 rounded-lg hover:bg-green-50 text-[#25D366]">
                      <Phone className="w-4 h-4" />
                    </a>
                    <select value={l.status || 'new'} onChange={e => updateStatus(l, e.target.value)}
                      className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 bg-white">
                      {Object.entries(STATUS_BADGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    {l.origin === 'tenant' && (
                      <button onClick={() => deleteLead(l)} className="p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100" data-testid={`delete-lead-${l.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && <LeadFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); showToast('success', 'Lead added'); load(); }} headers={headers} />}
    </BusinessAdminLayout>
  );
}

function LeadFormModal({ onClose, onSaved, headers }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'manual',
    service_interest: '', description: '', status: 'new',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    const r = await fetch(`${API}/memoraai/crm/leads`, {
      method: 'POST', headers, body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="lead-form-modal">
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-xl rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-sky-600" /> Add New Lead</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" data-testid="close-lead-form"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-3">
          {/* Simple 2-field top row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full Name *"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="E.g., Ramesh Kumar" className="input-base" data-testid="lead-name" /></Field>
            <Field label="Phone / WhatsApp *"><input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" className="input-base" data-testid="lead-phone" /></Field>
          </div>

          <Field label="Where did you meet them? (Source) *">
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="input-base" data-testid="lead-source">
              {SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>

          {/* Big description — the main field */}
          <Field label="Notes about this lead">
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows="4"
              placeholder="What do they need? Budget, timeline, language, concerns..."
              className="input-base"
              data-testid="lead-description"
            />
          </Field>

          {/* Collapsible more fields */}
          <details className="group">
            <summary className="text-xs font-semibold text-sky-600 cursor-pointer hover:text-sky-700 list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
              More fields (optional)
            </summary>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email"><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" className="input-base" data-testid="lead-email" /></Field>
              <Field label="Service / Interest"><input value={form.service_interest} onChange={e => setForm({ ...form, service_interest: e.target.value })} placeholder="Skin treatment, 2BHK flat, etc." className="input-base" data-testid="lead-service" /></Field>
            </div>
          </details>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={saving || !form.name.trim() || !form.phone.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" data-testid="save-lead-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Lead
          </button>
        </div>
        <style>{`.input-base { width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: white; } .input-base:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  const cls = {
    sky: 'bg-sky-50 text-sky-600',
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
