import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone, Plus, Loader2, Send, Users, Clock, CheckCircle2,
  FileText, ArrowRight, Sparkles
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Broadcast() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/memoraai/templates`, { headers });
      if (r.ok) setTemplates((await r.json()).templates || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <BusinessAdminLayout
      pageTitle="Broadcast"
      pageSubtitle="Send approved WhatsApp templates to segments of your customers — in one tap."
      headerRight={
        <button onClick={() => navigate('/memoraai-templates')}
          className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-violet-600/30 hover:from-violet-700 hover:to-indigo-700">
          <Plus className="w-4 h-4" /> New Template
        </button>
      }
    >
      {/* Coming soon / Campaign section */}
      <section className="bg-gradient-to-br from-violet-50 via-indigo-50 to-white border border-violet-200/50 rounded-3xl p-6 mb-6 relative overflow-hidden" data-testid="broadcast-hero">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-300/20 rounded-full blur-3xl" />
        <div className="flex items-start gap-4 relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Broadcast Campaigns</h2>
              <span className="text-[10px] bg-gradient-to-r from-violet-500 to-sky-500 text-white font-bold px-2 py-0.5 rounded-full uppercase">Coming Soon</span>
            </div>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
              Send approved WhatsApp templates to 10 or 10,000 customers at once — segmented by industry, interest, or last visit.
              Track delivery, reads, and reply-rate in real time. Until launch, use templates below for manual 1:1 sends.
            </p>
          </div>
        </div>
      </section>

      {/* Templates grid */}
      <section className="bg-white border border-gray-200/70 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Approved Templates</h3>
            <p className="text-xs text-gray-500">Pre-approved WhatsApp templates ready to send</p>
          </div>
          <span className="text-[10px] bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">{templates.length} items</span>
        </div>

        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto" /></div>
        ) : templates.length === 0 ? (
          <div className="p-10 text-center" data-testid="broadcast-empty">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="font-semibold text-gray-900">No templates yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">Create your first WhatsApp template — appointment reminder, offer blast, or follow-up.</p>
            <button onClick={() => navigate('/memoraai-templates')}
              className="inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg">
              Create Template <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {templates.map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50" data-testid={`template-${t.id}`}>
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{t.name || t.title || 'Untitled'}</p>
                  <p className="text-xs text-gray-500 truncate">{(t.content || t.body || '').slice(0, 120)}</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Active</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </BusinessAdminLayout>
  );
}
