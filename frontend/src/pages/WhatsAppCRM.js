import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, MessageCircle, User, MapPin, Search, Calendar, CheckCircle, ArrowRight, AlertTriangle, Flame, Snowflake, Users, BarChart3, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SCORE_CONFIG = {
  hot: { label: 'Hot', color: 'bg-red-500 text-white', icon: Flame },
  warm: { label: 'Warm', color: 'bg-orange-500 text-white', icon: AlertTriangle },
  cold: { label: 'Cold', color: 'bg-blue-400 text-white', icon: Snowflake },
  new: { label: 'New', color: 'bg-gray-500 text-white', icon: User },
};

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
  { value: 'followed_up', label: 'Followed Up' },
  { value: 'visit_scheduled', label: 'Visit Scheduled' },
  { value: 'closed', label: 'Closed' },
];

function getToken() {
  return localStorage.getItem('token');
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...opts.headers },
  });
  return res.json();
}

// ─── Stat Card ───
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`} className={`rounded-xl p-4 ${color} text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {Icon && <Icon className="w-8 h-8 opacity-60" />}
      </div>
    </div>
  );
}

// ─── Lead Card ───
function LeadCard({ lead, agents, onUpdate, onAssign, isAdmin }) {
  const score = lead.lead_score || lead.status || 'new';
  const cfg = SCORE_CONFIG[score] || SCORE_CONFIG.new;
  const ScoreIcon = cfg.icon;

  const handleCall = () => { window.open(`tel:${lead.buyer_phone}`, '_self'); };
  const handleWhatsApp = () => { window.open(`https://wa.me/${lead.buyer_phone}`, '_blank'); };

  const handleFollowedUp = async () => {
    await apiFetch(`/api/whatsapp/crm/leads/${lead.id}/followed-up`, { method: 'POST' });
    toast.success('Marked as followed up');
    onUpdate();
  };

  const handleScheduleVisit = async () => {
    await apiFetch(`/api/whatsapp/crm/leads/${lead.id}/schedule-visit`, { method: 'POST' });
    toast.success('Site visit scheduled');
    onUpdate();
  };

  const handleStatusChange = async (newStatus) => {
    await apiFetch(`/api/whatsapp/crm/leads/${lead.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });
    toast.success(`Status: ${newStatus}`);
    onUpdate();
  };

  const handleAssign = async (agentId) => {
    await apiFetch(`/api/whatsapp/crm/leads/${lead.id}`, {
      method: 'PUT',
      body: JSON.stringify({ assigned_to: agentId }),
    });
    toast.success('Agent assigned');
    onUpdate();
  };

  const assignedAgent = agents.find(a => a.id === lead.assigned_to);

  return (
    <Card data-testid={`lead-card-${lead.id}`} className="border-l-4 hover:shadow-md transition-shadow"
      style={{ borderLeftColor: score === 'hot' ? '#ef4444' : score === 'warm' ? '#f97316' : '#94a3b8' }}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">{lead.buyer_name || 'Unknown'}</h3>
              <Badge className={`${cfg.color} text-[10px] px-1.5 py-0`}>
                <ScoreIcon className="w-3 h-3 mr-0.5" />{cfg.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{lead.buyer_phone}</p>
          </div>
          {lead.next_action && (
            <Badge variant="outline" className="text-[10px] shrink-0">{lead.next_action}</Badge>
          )}
        </div>

        {/* CRM Fields */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {lead.interested_property_type && (
            <div className="text-gray-600"><span className="font-medium">Type:</span> {lead.interested_property_type}</div>
          )}
          {lead.preferred_location && (
            <div className="text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.preferred_location}</div>
          )}
          {lead.budget_text && (
            <div className="text-gray-600"><span className="font-medium">Budget:</span> {lead.budget_text}</div>
          )}
          {lead.purpose && (
            <div className="text-gray-600"><span className="font-medium">Purpose:</span> {lead.purpose}</div>
          )}
          {lead.timeline && (
            <div className="text-gray-600"><span className="font-medium">Timeline:</span> {lead.timeline}</div>
          )}
          {lead.lead_source && (
            <div className="text-gray-600"><span className="font-medium">Source:</span> {lead.lead_source}</div>
          )}
        </div>

        {/* First message summary */}
        {lead.first_message && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded p-2 line-clamp-2">{lead.first_message}</p>
        )}

        {/* Assigned Agent */}
        {assignedAgent && (
          <div className="text-xs text-indigo-600 flex items-center gap-1">
            <User className="w-3 h-3" />Assigned: {assignedAgent.name}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button data-testid="btn-call" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleCall}>
            <Phone className="w-3 h-3" />Call
          </Button>
          <Button data-testid="btn-whatsapp" size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-600 border-green-300" onClick={handleWhatsApp}>
            <MessageCircle className="w-3 h-3" />WhatsApp
          </Button>
          <Button data-testid="btn-followedup" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleFollowedUp}>
            <CheckCircle className="w-3 h-3" />Followed Up
          </Button>
          <Button data-testid="btn-visit" size="sm" variant="outline" className="h-7 text-xs gap-1 text-blue-600" onClick={handleScheduleVisit}>
            <Calendar className="w-3 h-3" />Visit
          </Button>
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select onValueChange={handleAssign}>
              <SelectTrigger data-testid="btn-assign" className="h-7 w-28 text-xs"><SelectValue placeholder="Assign" /></SelectTrigger>
              <SelectContent>
                {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───
export default function WhatsAppCRM() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'tenant_admin'].includes(user?.role);

  const [metrics, setMetrics] = useState({});
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, agentsRes] = await Promise.all([
        apiFetch('/api/whatsapp/crm/dashboard'),
        isAdmin ? apiFetch('/api/whatsapp/crm/agents') : Promise.resolve({ agents: [] }),
      ]);
      setMetrics(metricsRes);
      setAgents(agentsRes.agents || []);

      // Build lead query
      let query = '/api/whatsapp/crm/leads?limit=100';
      if (filter !== 'all') query += `&score=${filter}`;
      if (!isAdmin) query += `&assigned_to=${user?.id}`;

      const leadsRes = await apiFetch(query);
      setLeads(leadsRes.leads || []);
      setTotal(leadsRes.total || 0);
    } catch (e) {
      toast.error('Failed to load CRM data');
    }
    setLoading(false);
  }, [filter, isAdmin, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter leads by search
  const filteredLeads = leads.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (l.buyer_name || '').toLowerCase().includes(s)
      || (l.buyer_phone || '').includes(s)
      || (l.interested_property_type || '').toLowerCase().includes(s)
      || (l.preferred_location || '').toLowerCase().includes(s);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div data-testid="whatsapp-crm-dashboard" className="max-w-6xl mx-auto p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">WhatsApp CRM</h1>
          <p className="text-sm text-gray-500">{isAdmin ? 'Admin Dashboard' : 'My Leads'} — {total} leads</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadData} className="text-xs">Refresh</Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="New Leads" value={metrics.new_leads || 0} icon={Users} color="bg-slate-600" />
        <StatCard label="Hot Leads" value={metrics.total_hot || 0} icon={Flame} color="bg-red-500" />
        <StatCard label="Warm" value={metrics.total_warm || 0} icon={AlertTriangle} color="bg-orange-500" />
        <StatCard label="Calls Needed" value={metrics.calls_needed || 0} icon={PhoneCall} color="bg-indigo-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            data-testid="search-input"
            placeholder="Search name, phone, type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        {['all', 'hot', 'warm', 'cold'].map(f => (
          <Button
            key={f}
            data-testid={`filter-${f}`}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            className="h-9 text-xs capitalize"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f}
            {f !== 'all' && <span className="ml-1 opacity-70">
              ({leads.filter(l => (l.lead_score || l.status) === f).length})
            </span>}
          </Button>
        ))}
      </div>

      {/* Lead Cards */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No leads found</p>
          </div>
        ) : (
          filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              agents={agents}
              onUpdate={loadData}
              onAssign={loadData}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>
    </div>
  );
}
