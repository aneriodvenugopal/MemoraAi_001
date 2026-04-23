import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ClipboardList, MapPin } from 'lucide-react';

const TYPES = ['Land', 'Plot', 'Apartment', 'Flat', 'House', 'Commercial'];

const Requirements = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ property_type: 'Land', budget_min: '', budget_max: '', budget_unit: 'Lakhs', location_preference: '', description: '' });

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    try { const res = await api().get('/requirements'); setRequirements(res.data); } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await api().post('/requirements', { ...form, budget_min: parseFloat(form.budget_min) || 0, budget_max: parseFloat(form.budget_max) || 0 });
      setRequirements(prev => [res.data, ...prev]);
      setShowModal(false);
      setForm({ property_type: 'Land', budget_min: '', budget_max: '', budget_unit: 'Lakhs', location_preference: '', description: '' });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-gray-600" /></button>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Requirements</h1>
              <p className="text-[10px] text-gray-400">Post what you need</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} data-testid="add-requirement-btn" className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center"><Plus className="w-4 h-4 text-white" /></button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-lg h-24 animate-pulse" />) :
          requirements.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400 mb-3">No requirements</p>
              <button onClick={() => setShowModal(true)} data-testid="add-first-requirement" className="px-4 py-2 bg-teal-500 text-white text-xs rounded-lg">Post Requirement</button>
            </div>
          ) : requirements.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-600">{r.property_type}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${r.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
              </div>
              <p className="text-sm font-bold text-gray-900">₹{r.budget_min} - ₹{r.budget_max} {r.budget_unit}</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{r.location_preference}</p>
              {r.description && <p className="text-[10px] text-gray-400 mt-2 truncate">{r.description}</p>}
            </motion.div>
          ))
        }
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="w-full max-h-[80vh] overflow-y-auto bg-white rounded-t-2xl p-4">
              <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <h2 className="text-sm font-bold text-gray-900 mb-3">Post Requirement</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Type</p>
                  <div className="flex flex-wrap gap-1">
                    {TYPES.map(t => <button key={t} type="button" onClick={() => setForm({ ...form, property_type: t })} className={`px-2 py-1 rounded text-[10px] ${form.property_type === t ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{t}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-[10px] text-gray-400 mb-1">Min</p><input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} data-testid="input-budget-min" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm" required /></div>
                  <div><p className="text-[10px] text-gray-400 mb-1">Max</p><input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} data-testid="input-budget-max" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm" required /></div>
                </div>
                <div className="flex gap-1">
                  {['Lakhs', 'Crore'].map(u => <button key={u} type="button" onClick={() => setForm({ ...form, budget_unit: u })} className={`flex-1 py-2 rounded-lg text-xs ${form.budget_unit === u ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{u}</button>)}
                </div>
                <div><p className="text-[10px] text-gray-400 mb-1">Location</p><input type="text" value={form.location_preference} onChange={(e) => setForm({ ...form, location_preference: e.target.value })} data-testid="input-location" placeholder="e.g., Kukatpally" className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm" required /></div>
                <div><p className="text-[10px] text-gray-400 mb-1">Details</p><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-description" rows={2} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm resize-none" /></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Cancel</button>
                  <button type="submit" data-testid="submit-requirement" className="flex-1 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium">Post</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Requirements;
