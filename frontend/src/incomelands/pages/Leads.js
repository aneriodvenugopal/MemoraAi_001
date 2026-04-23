import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, Phone, MessageSquare } from 'lucide-react';

const STATUSES = ['new', 'contacted', 'hot', 'warm', 'cold', 'closed'];

const Leads = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    try { const res = await api().get('/leads'); setLeads(res.data); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try { await api().put(`/leads/${id}/status`, null, { params: { status } }); setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l)); } catch (e) { console.error(e); }
  };

  const getStatusStyle = (s) => {
    switch (s) {
      case 'hot': return 'bg-red-100 text-red-600';
      case 'warm': return 'bg-sky-100 text-sky-600';
      case 'cold': return 'bg-blue-100 text-blue-600';
      case 'closed': return 'bg-green-100 text-green-600';
      case 'contacted': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-gray-600" /></button>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Leads</h1>
            <p className="text-[10px] text-gray-400">{leads.length} inquiries</p>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 flex gap-2">
        {[
          { label: 'Hot', count: leads.filter(l => l.status === 'hot').length, color: 'text-red-500' },
          { label: 'Warm', count: leads.filter(l => l.status === 'warm').length, color: 'text-sky-500' },
          { label: 'Closed', count: leads.filter(l => l.status === 'closed').length, color: 'text-green-500' },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-white rounded-lg p-2 text-center border border-gray-100">
            <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[9px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-3 space-y-2">
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-lg h-24 animate-pulse" />) :
          leads.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No leads yet</p>
            </div>
          ) : leads.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-gray-900">{l.buyer_name}</p>
                  <p className="text-[10px] text-gray-400">{l.buyer_phone}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${getStatusStyle(l.status)}`}>{l.status}</span>
              </div>
              {l.message && <p className="text-[10px] text-gray-500 mb-2 p-2 bg-gray-50 rounded">"{l.message}"</p>}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <a href={`tel:${l.buyer_phone}`} data-testid={`call-${l.id}`} className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center"><Phone className="w-3 h-3 text-green-600" /></a>
                  <a href={`https://wa.me/${l.buyer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" data-testid={`whatsapp-${l.id}`} className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center"><MessageSquare className="w-3 h-3 text-green-600" /></a>
                </div>
                <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value)} data-testid={`status-select-${l.id}`} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px]">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </motion.div>
          ))
        }
      </div>
    </div>
  );
};

export default Leads;
