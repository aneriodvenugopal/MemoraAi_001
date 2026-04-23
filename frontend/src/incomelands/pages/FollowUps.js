import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  ArrowLeft, Plus, Phone, MessageSquare, Calendar, User, 
  Clock, X, Check, MoreHorizontal
} from 'lucide-react';

const FollowUps = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newFollowup, setNewFollowup] = useState({ 
    contact_name: '', 
    contact_phone: '', 
    notes: '', 
    next_follow_up: '' 
  });

  useEffect(() => { fetchFollowups(); }, []);

  const fetchFollowups = async () => {
    try {
      const res = await api().get('/followups');
      const sorted = res.data.sort((a, b) => {
        if (!a.next_follow_up) return 1;
        if (!b.next_follow_up) return -1;
        return new Date(a.next_follow_up) - new Date(b.next_follow_up);
      });
      setFollowups(sorted);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await api().post('/followups', newFollowup);
      setFollowups(prev => [res.data, ...prev].sort((a, b) => {
        if (!a.next_follow_up) return 1;
        if (!b.next_follow_up) return -1;
        return new Date(a.next_follow_up) - new Date(b.next_follow_up);
      }));
      setShowAdd(false);
      setNewFollowup({ contact_name: '', contact_phone: '', notes: '', next_follow_up: '' });
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api().put(`/followups/${id}`, null, { params: { status } });
      setFollowups(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    } catch (e) { console.error(e); }
  };

  const getDateLabel = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Overdue', color: 'text-red-500', bg: 'bg-red-50' };
    if (diff === 0) return { label: 'Today', color: 'text-sky-600', bg: 'bg-sky-50' };
    if (diff === 1) return { label: 'Tomorrow', color: 'text-green-500', bg: 'bg-green-50' };
    if (diff <= 7) return { label: `In ${diff} days`, color: 'text-blue-500', bg: 'bg-blue-50' };
    return { label: date.toLocaleDateString(), color: 'text-gray-500', bg: 'bg-gray-100' };
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} data-testid="back-btn" className="w-10 h-10 flex items-center justify-center">
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Follow-ups</h1>
              <p className="text-xs text-gray-500">{followups.length} contacts</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            data-testid="add-followup-btn"
            className="w-10 h-10 flex items-center justify-center"
          >
            <Plus className="w-6 h-6 text-blue-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl skeleton" />
            ))}
          </div>
        ) : followups.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-900 font-semibold">No follow-ups yet</p>
            <p className="text-gray-500 text-sm mt-1">Add contacts to follow up with</p>
            <button 
              onClick={() => setShowAdd(true)}
              className="mt-6 px-8 py-3 bg-blue-500 text-white font-semibold rounded-xl"
            >
              Add Follow-up
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {followups.map((f, i) => {
              const dateInfo = getDateLabel(f.next_follow_up);
              
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-white rounded-xl border p-4 ${
                    f.status === 'completed' ? 'border-green-200 bg-green-50/50' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-lg">
                        {f.contact_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900">{f.contact_name}</p>
                        {dateInfo && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dateInfo.bg} ${dateInfo.color}`}>
                            {dateInfo.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{f.contact_phone}</p>
                      {f.notes && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{f.notes}</p>
                      )}
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <a 
                          href={`tel:${f.contact_phone}`}
                          className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-center gap-1"
                        >
                          <Phone className="w-4 h-4" /> Call
                        </a>
                        <a 
                          href={`https://wa.me/91${f.contact_phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-green-100 rounded-lg text-sm font-medium text-green-700 flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-4 h-4" /> WhatsApp
                        </a>
                        {f.status !== 'completed' && (
                          <button
                            onClick={() => updateStatus(f.id, 'completed')}
                            className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center"
                          >
                            <Check className="w-5 h-5 text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Follow-up Bottom Sheet */}
      <Drawer.Root open={showAdd} onOpenChange={setShowAdd}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] outline-none">
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              
              <h2 className="text-xl font-bold text-gray-900 mb-6">New Follow-up</h2>
              
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">Contact Name</label>
                  <input
                    type="text"
                    value={newFollowup.contact_name}
                    onChange={(e) => setNewFollowup({ ...newFollowup, contact_name: e.target.value })}
                    placeholder="Enter name"
                    className="w-full"
                    required
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    value={newFollowup.contact_phone}
                    onChange={(e) => setNewFollowup({ ...newFollowup, contact_phone: e.target.value })}
                    placeholder="Enter phone"
                    className="w-full"
                    required
                    data-testid="input-phone"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">Notes</label>
                  <textarea
                    value={newFollowup.notes}
                    onChange={(e) => setNewFollowup({ ...newFollowup, notes: e.target.value })}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full resize-none"
                    data-testid="input-notes"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1.5 block">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={newFollowup.next_follow_up}
                    onChange={(e) => setNewFollowup({ ...newFollowup, next_follow_up: e.target.value })}
                    className="w-full"
                    data-testid="input-date"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-500 text-white font-semibold rounded-xl mt-2"
                  data-testid="submit-followup-btn"
                >
                  Add Follow-up
                </button>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};

export default FollowUps;
