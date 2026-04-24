import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Phone, MessageSquare, Search, Loader2, ExternalLink,
  Filter, Calendar, ArrowRight
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/memoraai/inbox/conversations?limit=500`, { headers });
      if (r.ok) {
        const data = await r.json();
        // Group by customer_phone -> last conversation
        const byPhone = new Map();
        (data.conversations || []).forEach(c => {
          const p = c.customer_phone;
          if (!p) return;
          const existing = byPhone.get(p);
          if (!existing || (c.last_message_at || '') > (existing.last_message_at || '')) {
            byPhone.set(p, c);
          }
        });
        setContacts([...byPhone.values()].sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || '')));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = contacts.filter(c =>
    !search.trim() ||
    (c.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_phone || '').includes(search)
  );

  return (
    <BusinessAdminLayout
      pageTitle="Contacts"
      pageSubtitle="Every customer who has ever messaged your business on WhatsApp."
      headerRight={
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {contacts.length} contacts
        </div>
      }
    >
      <div className="bg-white border border-gray-200/70 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone number..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              data-testid="contacts-search"
            />
          </div>
          <button onClick={() => navigate('/team-inbox')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-violet-600/30 hover:from-violet-700 hover:to-indigo-700"
            data-testid="open-team-inbox">
            <MessageSquare className="w-4 h-4" /> Open Team Inbox
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
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Customers you've chatted with on WhatsApp will show up here. Connect your WhatsApp Business API to get started.</p>
            <button onClick={() => navigate('/waba-setup')}
              className="mt-4 inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg">
              Set up WhatsApp <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50" data-testid="contacts-list">
            {filtered.map((c, i) => (
              <li key={c.id || i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 cursor-pointer group"
                onClick={() => navigate('/team-inbox')} data-testid={`contact-${c.id || i}`}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0">
                  {(c.customer_name || c.customer_phone || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.customer_name || c.customer_phone || 'Unknown'}</p>
                    {c.is_hot && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">HOT</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {c.customer_phone} · {c.last_message || 'No messages yet'}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-400 flex-shrink-0">
                  {c.last_message_at && (
                    <span>{new Date(c.last_message_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  )}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BusinessAdminLayout>
  );
}
