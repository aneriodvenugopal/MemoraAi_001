import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  ArrowLeft, Phone, MessageSquare, ChevronRight, Filter,
  Flame, Thermometer, Snowflake, CheckCircle2, UserPlus, Eye,
  Clock, TrendingUp, Search, X, MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const PIPELINE_STAGES = [
  { id: 'all', label: 'All', icon: TrendingUp, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' },
  { id: 'new', label: 'New', icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'contacted', label: 'Contacted', icon: Phone, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'hot', label: 'Hot', icon: Flame, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { id: 'warm', label: 'Warm', icon: Thermometer, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'cold', label: 'Cold', icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-50', border: 'border-blue-100' },
  { id: 'closed', label: 'Closed', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
];

const Leads = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState('all');
  const [stats, setStats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusChange, setShowStatusChange] = useState(null);

  useEffect(() => { fetchLeads(); fetchStats(); }, []);

  const fetchLeads = async () => {
    try { 
      const res = await api().get('/leads'); 
      setLeads(res.data); 
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await api().get('/leads/stats');
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id, status) => {
    try { 
      await api().put(`/leads/${id}/status`, null, { params: { status } }); 
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l)); 
      setShowStatusChange(null);
      toast.success(`Lead marked as ${status}`);
      fetchStats();
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to update');
    }
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (activeStage !== 'all') {
      result = result.filter(l => l.status === activeStage);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.buyer_name?.toLowerCase().includes(q) || 
        l.buyer_phone?.includes(q) ||
        l.property_location?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, activeStage, searchQuery]);

  const getStageInfo = (status) => {
    return PIPELINE_STAGES.find(s => s.id === status) || PIPELINE_STAGES[1];
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Lead Pipeline</h1>
            <p className="text-xs text-gray-500">{leads.length} total leads</p>
          </div>
        </div>
      </header>

      {/* Pipeline Stats Cards */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {[
            { label: 'Hot', count: stats.hot || 0, icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Warm', count: stats.warm || 0, icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Cold', count: stats.cold || 0, icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-50' },
            { label: 'New', count: stats.new || 0, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Closed', count: stats.closed || 0, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} data-testid={`stat-${s.label.toLowerCase()}`} className={`${s.bg} rounded-xl px-4 py-3 min-w-[80px] text-center`}>
                <Icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-gray-500 font-medium">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name, phone, location..."
            data-testid="search-leads"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Filter Tabs */}
      <div className="px-4 mb-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {PIPELINE_STAGES.map(stage => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            const count = stage.id === 'all' ? leads.length : leads.filter(l => l.status === stage.id).length;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                data-testid={`filter-${stage.id}`}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  isActive 
                    ? `${stage.bg} ${stage.color} border ${stage.border}` 
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {stage.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Leads List */}
      <div className="px-4 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl h-28 animate-pulse" />)
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-900 font-semibold">No leads {activeStage !== 'all' ? `in "${activeStage}"` : 'yet'}</p>
            <p className="text-gray-500 text-sm mt-1">Leads appear when buyers enquire about your properties</p>
          </div>
        ) : (
          filteredLeads.map((lead, i) => {
            const stageInfo = getStageInfo(lead.status);
            const StageIcon = stageInfo.icon;
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                data-testid={`lead-card-${lead.id}`}
              >
                <div className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{lead.buyer_name}</p>
                      <p className="text-xs text-gray-500">{lead.buyer_phone}</p>
                    </div>
                    <button 
                      onClick={() => setShowStatusChange(lead)}
                      data-testid={`status-btn-${lead.id}`}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${stageInfo.bg} ${stageInfo.color} border ${stageInfo.border}`}
                    >
                      <StageIcon className="w-3 h-3" />
                      {stageInfo.label}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Property Info */}
                  {lead.property_location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{lead.property_type} - {lead.property_location}</span>
                      {lead.property_price > 0 && (
                        <span className="ml-auto font-medium text-gray-700">
                          {'\u20B9'}{lead.property_price} {lead.property_price_unit}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message */}
                  {lead.message && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 mb-3 line-clamp-2">"{lead.message}"</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <a 
                      href={`tel:${lead.buyer_phone}`}
                      data-testid={`call-${lead.id}`}
                      className="flex-1 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 flex items-center justify-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    <a 
                      href={`https://wa.me/91${lead.buyer_phone?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`whatsapp-${lead.id}`}
                      className="flex-1 py-2 bg-green-100 rounded-lg text-xs font-medium text-green-700 flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <span className="text-[10px] text-gray-400">{timeAgo(lead.created_at)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Status Change Drawer */}
      <Drawer.Root open={!!showStatusChange} onOpenChange={(open) => !open && setShowStatusChange(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[1002] outline-none">
            <div className="p-4 pb-8">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-1">Change Lead Status</h2>
              <p className="text-sm text-gray-500 mb-4">{showStatusChange?.buyer_name} - {showStatusChange?.buyer_phone}</p>
              
              <div className="grid grid-cols-2 gap-2">
                {PIPELINE_STAGES.filter(s => s.id !== 'all').map(stage => {
                  const Icon = stage.icon;
                  const isActive = showStatusChange?.status === stage.id;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => updateStatus(showStatusChange?.id, stage.id)}
                      data-testid={`set-status-${stage.id}`}
                      className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                        isActive ? `${stage.bg} border-current ${stage.color}` : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{stage.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};

export default Leads;
