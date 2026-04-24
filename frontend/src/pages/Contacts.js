import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Phone, MessageSquare, Search, Loader2, ArrowRight,
  Plus, X, Save, Trash2, Mail, MapPin
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Contacts() {
  const navigate = useNavigate();
  const [manual, setManual] = useState([]);
  const [chatContacts, setChatContacts] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const [manualR, chatR] = await Promise.all([
        fetch(`${API}/memoraai/crm/contacts`, { headers: authOnly }).then(r => r.ok ? r.json() : { contacts: [] }),
        fetch(`${API}/memoraai/inbox/conversations?limit=500`, { headers: authOnly }).then(r => r.ok ? r.json() : { conversations: [] }),
      ]);
      setManual(manualR.contacts || []);
      // Dedupe chat contacts by phone
      const byPhone = new Map();
      (chatR.conversations || []).forEach(c => {
        const p = c.customer_phone;
        if (!p || byPhone.has(p)) return;
        byPhone.set(p, c);
      });
      setChatContacts([...byPhone.values()]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const deleteContact = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    const r = await fetch(`${API}/memoraai/crm/contacts/${id}`, { method: 'DELETE', headers: authOnly });
    if (r.ok) { showToast('success', 'Deleted'); load(); }
  };

  const combined = [
    ...manual.map(c => ({ ...c, source: 'manual' })),
    ...chatContacts.map(c => ({
      id: c.id,
      name: c.customer_name || c.customer_phone,
      phone: c.customer_phone,
      description: c.last_message || '',
      source: 'whatsapp',
      is_hot: c.is_hot,
    })),
  ];
  const filtered = combined.filter(c =>
    !search.trim() ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BusinessAdminLayout pageTitle="Contacts" pageSubtitle="Every customer — from manual entries, WhatsApp chats, and imports."
      headerRight={
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-violet-600/30"
          data-testid="new-contact-btn">
          <Plus className="w-4 h-4" /> New Contact
        </button>
      }>
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{toast.msg}</div>
      )}

      <div className="bg-white border border-gray-200/70 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, description..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              data-testid="contacts-search" />
          </div>
          <button onClick={() => navigate('/team-inbox')} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-xl">
            <MessageSquare className="w-4 h-4" /> Inbox
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center" data-testid="contacts-empty">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="font-semibold text-gray-900">No contacts yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-3">Add your first contact manually, or contacts will appear automatically from WhatsApp conversations.</p>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg">
              <Plus className="w-3 h-3" /> Add Contact
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50" data-testid="contacts-list">
            {filtered.map((c, i) => (
              <li key={c.id || i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/50 group" data-testid={`contact-${c.id || i}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0">
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{c.name || 'Unknown'}</p>
                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium uppercase">{c.source}</span>
                    {c.is_hot && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">HOT</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {c.phone}{c.email ? ' · ' + c.email : ''}
                  </p>
                  {c.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{c.description}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={`https://wa.me/91${(c.phone || '').replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer"
                    className="p-2 rounded-lg hover:bg-green-50 text-[#25D366]">
                    <Phone className="w-4 h-4" />
                  </a>
                  {c.source === 'manual' && (
                    <button onClick={() => deleteContact(c.id)} className="p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100" data-testid={`delete-contact-${c.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && <ContactFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); showToast('success', 'Contact added'); load(); }} headers={headers} />}
    </BusinessAdminLayout>
  );
}

function ContactFormModal({ onClose, onSaved, headers }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', whatsapp: '', address: '', description: '', tags: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
    const r = await fetch(`${API}/memoraai/crm/contacts`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.ok) onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="contact-form-modal">
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white w-full max-w-xl rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-violet-600" /> Add New Contact</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700" data-testid="close-contact-form"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full Name *"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="E.g., Priya Sharma" className="input-base" data-testid="contact-name" /></Field>
            <Field label="Phone *"><input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" className="input-base" data-testid="contact-phone" /></Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="WhatsApp (if different)"><input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="Same as phone by default" className="input-base" data-testid="contact-whatsapp" /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" className="input-base" data-testid="contact-email" /></Field>
          </div>
          <Field label="Address (optional)">
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="City, pincode, landmark" className="input-base" data-testid="contact-address" />
          </Field>
          <Field label="Tags (comma separated)">
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="vip, premium, regular" className="input-base" data-testid="contact-tags" />
          </Field>

          {/* Big description */}
          <Field label="Description / All information">
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows="8"
              placeholder="Write everything you know about this contact: their preferences, past purchases, important dates (anniversary, birthday), family members, favourite service, communication preference, etc. The more context — the better your AI replies."
              className="input-base font-mono"
              style={{ minHeight: '180px' }}
              data-testid="contact-description"
            />
            <p className="text-[10px] text-gray-400 mt-1">{form.description.length} characters</p>
          </Field>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={saving || !form.name.trim() || !form.phone.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" data-testid="save-contact-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Contact
          </button>
        </div>
        <style>{`.input-base { width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: white; } .input-base:focus { outline: none; border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); }`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</span>{children}</label>;
}
