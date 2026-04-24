import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCog, Plus, Phone, Loader2, Trash2, X, Save, Copy, ShieldCheck,
  CheckCircle2, Key
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PERMISSIONS = [
  { key: 'content', label: 'Upload content & train AI' },
  { key: 'leads',   label: 'View & manage leads' },
  { key: 'contacts',label: 'View & manage contacts' },
  { key: 'inbox',   label: 'Reply in Team Inbox' },
  { key: 'analytics',label: 'View analytics' },
  { key: 'bookings',label: 'Manage bookings' },
];

export default function StaffMembers() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [credsShown, setCredsShown] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const authOnly = { Authorization: `Bearer ${token}` };

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/memoraai/staff`, { headers: authOnly });
    if (r.ok) setStaff((await r.json()).staff || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const deleteStaff = async (id) => {
    if (!window.confirm('Remove this staff member? They will lose access immediately.')) return;
    const r = await fetch(`${API}/memoraai/staff/${id}`, { method: 'DELETE', headers: authOnly });
    if (r.ok) { showToast('success', 'Staff removed'); load(); }
    else showToast('error', 'Failed to remove');
  };

  return (
    <BusinessAdminLayout pageTitle="Staff Members" pageSubtitle="Add your team members. Give them only the access they need."
      headerRight={
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-violet-600/30"
          data-testid="add-staff-btn">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      }>
      {toast && <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{toast.msg}</div>}

      <div className="bg-white border border-gray-200/70 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Your Team ({staff.length})</h3>
          <p className="text-xs text-gray-500 mt-0.5">Only business admins can add or remove staff.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto" /></div>
        ) : staff.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3"><UserCog className="w-7 h-7 text-violet-500" /></div>
            <h3 className="font-semibold text-gray-900">No team members yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-3">Busy? Add a staff member so they can upload content, handle leads, or reply in the inbox on your behalf.</p>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg">
              <Plus className="w-3 h-3" /> Add First Staff
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50" data-testid="staff-list">
            {staff.map(s => (
              <li key={s.id} className="px-5 py-3 flex items-center gap-3 group" data-testid={`staff-${s.id}`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0">
                  {(s.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{s.name || 'Unnamed'}</p>
                    {s.role === 'tenant_admin' ? (
                      <span className="text-[9px] bg-violet-100 text-violet-700 font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Business Admin
                      </span>
                    ) : (
                      <span className="text-[9px] bg-sky-100 text-sky-700 font-semibold px-1.5 py-0.5 rounded-full">Staff</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{s.phone}{s.email ? ' · ' + s.email : ''}</p>
                  {s.permissions && s.permissions.length > 0 && s.role !== 'tenant_admin' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.permissions.map(p => (
                        <span key={p} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">{PERMISSIONS.find(pp => pp.key === p)?.label || p}</span>
                      ))}
                    </div>
                  )}
                </div>
                {s.role !== 'tenant_admin' && (
                  <button onClick={() => deleteStaff(s.id)} className="p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100" data-testid={`delete-staff-${s.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)}
        onSaved={(creds) => { setShowAdd(false); setCredsShown(creds); load(); }} headers={headers} />}
      {credsShown && <CredsModal creds={credsShown} onClose={() => setCredsShown(null)} />}
    </BusinessAdminLayout>
  );
}

function AddStaffModal({ onClose, onSaved, headers }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', permissions: ['content', 'leads', 'contacts', 'inbox'] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const togglePerm = (key) => {
    setForm(f => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.phone.length !== 10) { setError('Enter name and 10-digit phone'); return; }
    setSaving(true); setError('');
    const r = await fetch(`${API}/memoraai/staff`, { method: 'POST', headers, body: JSON.stringify(form) });
    setSaving(false);
    if (r.ok) {
      const data = await r.json();
      onSaved({ name: form.name, phone: form.phone, password: data.default_password });
    } else {
      const err = await r.json().catch(() => ({}));
      setError(err.detail || 'Failed to add staff');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="add-staff-modal">
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><UserCog className="w-5 h-5 text-violet-600" /> Add Staff Member</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block"><span className="text-[11px] font-semibold text-gray-600 mb-1 block">Full Name *</span>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="E.g., Ramya Naidu" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="staff-name" /></label>
          <label className="block"><span className="text-[11px] font-semibold text-gray-600 mb-1 block">Phone / WhatsApp *</span>
            <input required maxLength="10" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g,'').slice(0,10) })} placeholder="10-digit mobile" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="staff-phone" /></label>
          <label className="block"><span className="text-[11px] font-semibold text-gray-600 mb-1 block">Email (optional)</span>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" data-testid="staff-email" /></label>

          <div>
            <span className="text-[11px] font-semibold text-gray-600 mb-2 block">What can this person do?</span>
            <div className="space-y-1.5">
              {PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer p-1.5 hover:bg-gray-50 rounded-lg" data-testid={`perm-${p.key}`}>
                  <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} className="rounded text-violet-600 focus:ring-violet-400" />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
            <Key className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>A default password will be generated. Share it with your staff so they can log in immediately.</span>
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" data-testid="save-staff-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Add Staff
          </button>
        </div>
      </form>
    </div>
  );
}

function CredsModal({ creds, onClose }) {
  const [copied, setCopied] = useState('');
  const copy = async (val, key) => { await navigator.clipboard.writeText(val); setCopied(key); setTimeout(() => setCopied(''), 1500); };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="creds-modal">
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /><h2 className="font-bold">Staff Added Successfully!</h2></div>
          <p className="text-xs text-violet-100 mt-1">Share these credentials with {creds.name} so they can log in.</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <p className="text-[10px] uppercase font-semibold text-gray-500 tracking-widest">Login Phone</p>
            <div className="flex items-center justify-between mt-1">
              <code className="text-lg font-mono font-bold text-gray-900">{creds.phone}</code>
              <button onClick={() => copy(creds.phone, 'phone')} className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1" data-testid="copy-phone">
                <Copy className="w-3 h-3" /> {copied === 'phone' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-3">
            <p className="text-[10px] uppercase font-semibold text-violet-300 tracking-widest">Temporary Password</p>
            <div className="flex items-center justify-between mt-1">
              <code className="text-lg font-mono font-bold text-white">{creds.password}</code>
              <button onClick={() => copy(creds.password, 'pwd')} className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 bg-white/10 px-2 py-1 rounded" data-testid="copy-password">
                <Copy className="w-3 h-3" /> {copied === 'pwd' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-violet-200 mt-2">They can change this password after first login.</p>
          </div>
          <button onClick={onClose} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-xl text-sm" data-testid="creds-done">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
