import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Workflow, Shield, Calendar, Brain, ArrowRight, CheckCircle2,
  Clock, Zap, Settings, Loader2
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Automation() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [corrStats, setCorrStats] = useState({ total: 0, active: 0, times_applied: 0 });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesR, corrR] = await Promise.all([
        fetch(`${API}/memoraai/rules`, { headers }).then(r => r.ok ? r.json() : { rules: [] }),
        fetch(`${API}/memoraai/corrections/stats/summary`, { headers }).then(r => r.ok ? r.json() : null),
      ]);
      setRules(rulesR.rules || []);
      if (corrR) {
        setCorrStats({
          total: corrR.total || 0,
          active: corrR.active || 0,
          times_applied: corrR.times_applied || corrR.total_times_applied || 0,
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const modules = [
    {
      key: 'rules', icon: Shield, color: 'sky',
      title: 'Business Rules', badge: `${rules.filter(r => r.is_active).length} active`,
      desc: 'Control exactly how your AI responds — tone, topics to avoid, escalation rules.',
      action: 'Manage Rules', to: '/business-rules',
    },
    {
      key: 'chat-learning', icon: Brain, color: 'blue',
      title: 'Chat Learning',
      badge: corrStats.active > 0 ? `${corrStats.active} active · ${corrStats.times_applied} applied` : null,
      desc: 'Correct AI replies once, the AI remembers forever. Perfect for India-specific edge cases.',
      action: 'Open Chat Learning', to: '/chat-corrections',
    },
    {
      key: 'calendar', icon: Calendar, color: 'emerald',
      title: 'Google Calendar Sync',
      desc: 'Every appointment auto-syncs to your Google Calendar — booked from dashboard or WhatsApp AI.',
      action: 'Connect Calendar', to: '/calendar-sync',
    },
    {
      key: 'follow-ups', icon: Clock, color: 'orange',
      title: 'Auto Follow-ups',
      desc: 'AI re-engages stale conversations after 24h, 3 days, or 1 week — with your approved message.',
      action: 'View Follow-up Queue', to: '/memoraai-appointments',
    },
    {
      key: 'hot-sales', icon: Zap, color: 'rose',
      title: 'Hot Sales Detection',
      desc: 'AI flags customers ready to buy today and alerts your team in the inbox.',
      action: 'Open Hot Sales', to: '/hot-sales-mode',
    },
  ];

  const colorMap = {
    sky: 'from-sky-500 to-blue-600 shadow-sky-500/30 bg-sky-50 text-sky-600',
    blue: 'from-blue-500 to-sky-600 shadow-blue-500/30 bg-blue-50 text-blue-600',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/30 bg-emerald-50 text-emerald-600',
    orange: 'from-orange-500 to-red-500 shadow-orange-500/30 bg-orange-50 text-orange-600',
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/30 bg-rose-50 text-rose-600',
  };

  return (
    <BusinessAdminLayout
      pageTitle="Automation"
      pageSubtitle="Set up workflows so your AI handles more work while your team handles bigger deals."
    >
      {/* Intro card */}
      <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-white border border-sky-200/50 rounded-3xl p-6 mb-6 flex items-start gap-4 relative overflow-hidden" data-testid="automation-hero">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-sky-300/20 rounded-full blur-3xl" />
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30 flex-shrink-0 relative">
          <Workflow className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 relative">
          <h2 className="text-xl font-bold text-gray-900">Your automation toolkit</h2>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Switch on the modules below to teach your AI how to behave, who to follow up with, and what to escalate.
            Most businesses start with Business Rules + Chat Learning.
          </p>
        </div>
      </div>

      {/* AI Learning live stats — shows owner how AI is learning from conversations */}
      <div className="grid grid-cols-3 gap-3 mb-6" data-testid="automation-learning-stats">
        <StatPill label="Active Rules" value={rules.filter(r => r.is_active).length} sub="controlling AI tone & topics" />
        <StatPill label="AI Corrections" value={corrStats.active} sub={`${corrStats.total} total taught`} />
        <StatPill label="Times AI Applied Learning" value={corrStats.times_applied} sub="in live replies" highlight />
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-8 text-center"><Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="automation-modules">
          {modules.map(m => {
            const [g1, g2, shadow, bg, text] = colorMap[m.color].split(' ');
            return (
              <div key={m.key} className="bg-white border border-gray-200/70 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all group" data-testid={`module-${m.key}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${g1} ${g2} flex items-center justify-center shadow-lg ${shadow} flex-shrink-0`}>
                    <m.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{m.title}</h3>
                      {m.badge && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${bg} ${text}`}>{m.badge}</span>}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mt-1">{m.desc}</p>
                  </div>
                </div>
                <button onClick={() => navigate(m.to)}
                  className="w-full mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 py-2 rounded-xl transition-colors group-hover:bg-sky-100"
                  data-testid={`module-action-${m.key}`}>
                  {m.action} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </BusinessAdminLayout>
  );
}

function StatPill({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-2xl p-3.5 border ${highlight ? 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200' : 'bg-white border-gray-200/70'} shadow-sm`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-sky-700' : 'text-gray-900'}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}
