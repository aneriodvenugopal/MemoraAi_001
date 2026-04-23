import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Drawer } from 'vaul';
import { 
  ArrowLeft, Plus, Phone, MessageSquare, Calendar, User, 
  Clock, X, Check, ChevronRight, ThumbsUp, ThumbsDown, 
  RefreshCw, Bell, StickyNote, MapPin, UserPlus, Search,
  EyeOff, Eye, Trash2, Users
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { id: 'interested', label: 'Interested', icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-100' },
  { id: 'not_interested', label: 'Not Interested', icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-100' },
  { id: 'reschedule', label: 'Reschedule', icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: 'followup_again', label: 'Follow-up Again', icon: Bell, color: 'text-blue-600', bg: 'bg-blue-100' },
];

const FollowUps = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [hiddenContacts, setHiddenContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'hidden'
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [showAddNote, setShowAddNote] = useState(null);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [newContact, setNewContact] = useState({ 
    contact_name: '', contact_phone: '', notes: '', location: ''
  });
  const [bulkContacts, setBulkContacts] = useState([
    { contact_name: '', contact_phone: '', selected: false }
  ]);
  const [newNote, setNewNote] = useState({
    status: '', feedback: '', next_date: '', next_time: ''
  });

  useEffect(() => { fetchFollowups(); }, []);

  const fetchFollowups = async () => {
    try {
      const [activeRes, hiddenRes] = await Promise.all([
        api().get('/followups?hidden=false'),
        api().get('/followups?hidden=true')
      ]);
      
      // Group by contact phone for active
      const groupActive = groupContacts(activeRes.data);
      const groupHidden = groupContacts(hiddenRes.data);
      
      setContacts(groupActive);
      setHiddenContacts(groupHidden);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const groupContacts = (data) => {
    const grouped = {};
    data.forEach(f => {
      const key = f.contact_phone;
      if (!grouped[key]) {
        grouped[key] = { ...f, history: [] };
      }
      if (f.status && f.status !== 'pending') {
        grouped[key].history.push({
          status: f.status,
          notes: f.notes,
          date: f.updated_at || f.created_at,
          next_follow_up: f.next_follow_up
        });
      }
    });
    return Object.values(grouped).sort((a, b) => {
      const aDate = a.next_follow_up || a.created_at;
      const bDate = b.next_follow_up || b.created_at;
      return new Date(bDate) - new Date(aDate);
    });
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      await api().post('/followups', { ...newContact, status: 'pending' });
      setShowAdd(false);
      setNewContact({ contact_name: '', contact_phone: '', notes: '', location: '' });
      toast.success('Contact added!');
      fetchFollowups();
    } catch (e) { 
      toast.error('Failed to add contact');
    }
  };

  const handleBulkAdd = async () => {
    const validContacts = bulkContacts.filter(c => c.contact_name && c.contact_phone);
    if (validContacts.length === 0) {
      toast.error('Add at least one contact');
      return;
    }
    try {
      const res = await api().post('/followups/bulk', { contacts: validContacts });
      toast.success(res.data.message);
      setShowBulkAdd(false);
      setBulkContacts([{ contact_name: '', contact_phone: '', selected: false }]);
      fetchFollowups();
    } catch (e) {
      toast.error('Failed to add contacts');
    }
  };

  const handleAddNote = async (contactId) => {
    if (!newNote.status) {
      toast.error('Please select a status');
      return;
    }
    try {
      const nextFollowUp = newNote.next_date 
        ? `${newNote.next_date}T${newNote.next_time || '10:00'}:00` : null;
      
      await api().put(`/followups/${contactId}`, null, {
        params: { status: newNote.status, notes: newNote.feedback, next_follow_up: nextFollowUp }
      });
      
      setShowAddNote(null);
      setNewNote({ status: '', feedback: '', next_date: '', next_time: '' });
      toast.success('Follow-up updated!');
      fetchFollowups();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const handleToggleHidden = async (contactId) => {
    try {
      const res = await api().put(`/followups/${contactId}/toggle-hidden`);
      toast.success(res.data.message);
      fetchFollowups();
    } catch (e) {
      toast.error('Failed to move contact');
    }
  };

  const handleDelete = async (contactId) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await api().delete(`/followups/${contactId}`);
      toast.success('Contact deleted');
      fetchFollowups();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const addBulkRow = () => {
    setBulkContacts(prev => [...prev, { contact_name: '', contact_phone: '', selected: false }]);
  };

  const updateBulkContact = (index, field, value) => {
    setBulkContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const removeBulkRow = (index) => {
    setBulkContacts(prev => prev.filter((_, i) => i !== index));
  };

  const importPhoneContact = async () => {
    if (!('contacts' in navigator)) {
      toast.error('Contact Picker not available on this device');
      return;
    }
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const selected = await navigator.contacts.select(props, opts);
      if (selected && selected.length > 0) {
        const newRows = selected.map(c => ({
          contact_name: c.name?.[0] || '',
          contact_phone: c.tel?.[0]?.replace(/\D/g, '') || '',
          selected: true
        }));
        setBulkContacts(prev => [...prev.filter(c => c.contact_name || c.contact_phone), ...newRows]);
        toast.success(`${selected.length} contact(s) imported`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusInfo = (status) => {
    return STATUS_OPTIONS.find(s => s.id === status) || STATUS_OPTIONS[3];
  };

  const getDateLabel = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Overdue', color: 'text-red-500', bg: 'bg-red-50' };
    if (diff === 0) return { label: 'Today', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (diff === 1) return { label: 'Tomorrow', color: 'text-green-500', bg: 'bg-green-50' };
    if (diff <= 7) return { label: `In ${diff} days`, color: 'text-blue-500', bg: 'bg-blue-50' };
    return { 
      label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), 
      color: 'text-gray-500', bg: 'bg-gray-100' 
    };
  };

  const formatDateTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('en-IN', { 
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const displayContacts = activeTab === 'active' ? contacts : hiddenContacts;
  
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return displayContacts;
    const q = searchQuery.toLowerCase();
    return displayContacts.filter(c => 
      c.contact_name?.toLowerCase().includes(q) || 
      c.contact_phone?.includes(q) || 
      c.location?.toLowerCase().includes(q)
    );
  }, [displayContacts, searchQuery]);

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
              <p className="text-xs text-gray-500">{contacts.length} active, {hiddenContacts.length} hidden</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowBulkAdd(true)}
              data-testid="bulk-add-btn"
              className="w-10 h-10 flex items-center justify-center"
              title="Add Multiple"
            >
              <Users className="w-5 h-5 text-blue-500" />
            </button>
            <button 
              onClick={async () => {
                // Try to open phone contacts directly
                if ('contacts' in navigator && 'ContactsManager' in window) {
                  try {
                    const props = ['name', 'tel'];
                    const opts = { multiple: true };
                    const selected = await navigator.contacts.select(props, opts);
                    if (selected && selected.length > 0) {
                      const newContacts = selected.map(c => ({
                        contact_name: c.name?.[0] || '',
                        contact_phone: c.tel?.[0]?.replace(/\D/g, '') || ''
                      })).filter(c => c.contact_name && c.contact_phone);
                      
                      if (newContacts.length > 0) {
                        try {
                          const res = await api().post('/followups/bulk', { contacts: newContacts });
                          toast.success(res.data.message || `${newContacts.length} contact(s) added`);
                          fetchFollowups();
                        } catch (e) {
                          toast.error('Failed to add contacts');
                        }
                      }
                    }
                  } catch (e) {
                    // User cancelled or API failed, show manual form
                    setShowAdd(true);
                  }
                } else {
                  // Contact Picker not available, show manual form
                  setShowAdd(true);
                }
              }}
              data-testid="add-followup-btn"
              className="w-10 h-10 flex items-center justify-center"
            >
              <Plus className="w-6 h-6 text-blue-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Active/Hidden Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('active')}
          data-testid="tab-active"
          className={`flex-1 py-3 text-center text-sm font-medium transition-all ${
            activeTab === 'active' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-400'
          }`}
        >
          Active ({contacts.length})
        </button>
        <button 
          onClick={() => setActiveTab('hidden')}
          data-testid="tab-hidden"
          className={`flex-1 py-3 text-center text-sm font-medium transition-all ${
            activeTab === 'hidden' 
              ? 'text-gray-600 border-b-2 border-gray-600' 
              : 'text-gray-400'
          }`}
        >
          Hidden ({hiddenContacts.length})
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            data-testid="search-followups"
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-20">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'hidden' ? <EyeOff className="w-8 h-8 text-gray-300" /> : <Clock className="w-8 h-8 text-gray-300" />}
            </div>
            <p className="text-gray-900 font-semibold">
              {activeTab === 'hidden' ? 'No hidden contacts' : 'No follow-ups yet'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {activeTab === 'hidden' 
                ? 'Contacts moved after discussion appear here' 
                : 'Add contacts to track your follow-ups'}
            </p>
            {activeTab === 'active' && (
              <button 
                onClick={() => setShowAdd(true)}
                className="mt-6 px-8 py-3 bg-blue-500 text-white font-semibold rounded-xl"
              >
                Add Contact
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact, i) => {
              const dateInfo = getDateLabel(contact.next_follow_up);
              const statusInfo = contact.status ? getStatusInfo(contact.status) : null;
              const StatusIcon = statusInfo?.icon || Clock;
              
              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  data-testid={`followup-card-${contact.id}`}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-lg">
                          {contact.contact_name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{contact.contact_name}</p>
                          {dateInfo && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dateInfo.bg} ${dateInfo.color}`}>
                              {dateInfo.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{contact.contact_phone}</p>
                        {contact.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />{contact.location}
                          </p>
                        )}
                        {statusInfo && contact.status !== 'pending' && (
                          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-lg ${statusInfo.bg}`}>
                            <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                            <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                          </div>
                        )}
                        {contact.notes && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2 italic">"{contact.notes}"</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                      <a 
                        href={`tel:${contact.contact_phone}`}
                        className="flex-1 py-2.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-4 h-4" /> Call
                      </a>
                      <a 
                        href={`https://wa.me/91${contact.contact_phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 bg-green-100 rounded-xl text-sm font-medium text-green-700 flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" /> WhatsApp
                      </a>
                      <button
                        onClick={() => setShowAddNote(contact)}
                        className="flex-1 py-2.5 bg-blue-500 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5"
                      >
                        <StickyNote className="w-4 h-4" /> Note
                      </button>
                    </div>

                    {/* Move/Delete Row */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleToggleHidden(contact.id)}
                        data-testid={`toggle-hidden-${contact.id}`}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 ${
                          activeTab === 'active' 
                            ? 'bg-gray-50 text-gray-500 border border-gray-200' 
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}
                      >
                        {activeTab === 'active' ? (
                          <><EyeOff className="w-3.5 h-3.5" /> Move to Hidden</>
                        ) : (
                          <><Eye className="w-3.5 h-3.5" /> Move to Active</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="py-2 px-3 rounded-xl text-xs font-medium text-red-500 bg-red-50 border border-red-200 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {contact.history && contact.history.length > 0 && (
                    <button
                      onClick={() => setShowHistory(contact)}
                      className="w-full px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-500">
                        {contact.history.length} previous follow-up{contact.history.length > 1 ? 's' : ''}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Single Contact Sheet */}
      <Drawer.Root open={showAdd} onOpenChange={setShowAdd}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[1002] outline-none max-h-[90vh] overflow-y-auto">
            <div className="p-4 pb-8">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Add Contact</h2>
              <p className="text-sm text-gray-500 mb-6">Pick from phone contacts or enter manually</p>
              
              <button
                type="button"
                onClick={async () => {
                  if ('contacts' in navigator && 'ContactsManager' in window) {
                    try {
                      const props = ['name', 'tel'];
                      const selected = await navigator.contacts.select(props, { multiple: false });
                      if (selected?.[0]) {
                        setNewContact({
                          ...newContact,
                          contact_name: selected[0].name?.[0] || '',
                          contact_phone: selected[0].tel?.[0]?.replace(/\D/g, '') || ''
                        });
                        toast.success('Contact imported!');
                      }
                    } catch (e) { 
                      toast.info('Open this app on your mobile phone to import contacts');
                    }
                  } else {
                    toast.info('Contact import works only on mobile phones. Enter details manually below.');
                  }
                }}
                data-testid="import-single-contact"
                className="w-full py-4 mb-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-3 shadow-lg"
              >
                <UserPlus className="w-5 h-5" /> Pick from Phone Contacts
              </button>
              
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="px-4 bg-white text-sm text-gray-400">or enter manually</span></div>
              </div>
              
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Contact Name *</label>
                  <input type="text" value={newContact.contact_name} onChange={(e) => setNewContact({ ...newContact, contact_name: e.target.value })} placeholder="Enter name" className="w-full px-4 py-3 border border-gray-200 rounded-xl" required data-testid="input-name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Phone Number *</label>
                  <input type="tel" value={newContact.contact_phone} onChange={(e) => setNewContact({ ...newContact, contact_phone: e.target.value })} placeholder="Enter phone" className="w-full px-4 py-3 border border-gray-200 rounded-xl" required data-testid="input-phone" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Location/Area</label>
                  <input type="text" value={newContact.location} onChange={(e) => setNewContact({ ...newContact, location: e.target.value })} placeholder="e.g., Banjara Hills" className="w-full px-4 py-3 border border-gray-200 rounded-xl" data-testid="input-location" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
                  <textarea value={newContact.notes} onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })} placeholder="Add notes..." rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none" data-testid="input-notes" />
                </div>
                <button type="submit" className="w-full py-4 bg-gray-900 text-white font-semibold rounded-xl" data-testid="submit-contact-btn">
                  Add Contact
                </button>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Bulk Add Contacts Sheet */}
      <Drawer.Root open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[1002] outline-none max-h-[90vh] overflow-y-auto">
            <div className="p-4 pb-8">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Add Multiple Contacts</h2>
              <p className="text-sm text-gray-500 mb-4">Add several contacts at once to your follow-up list</p>
              
              {'contacts' in navigator && (
                <button
                  type="button"
                  onClick={importPhoneContact}
                  data-testid="import-contacts-btn"
                  className="w-full py-3 mb-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" /> Import from Phone Contacts
                </button>
              )}
              
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                {bulkContacts.map((contact, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={contact.contact_name}
                        onChange={(e) => updateBulkContact(index, 'contact_name', e.target.value)}
                        placeholder="Name"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                        data-testid={`bulk-name-${index}`}
                      />
                      <input
                        type="tel"
                        value={contact.contact_phone}
                        onChange={(e) => updateBulkContact(index, 'contact_phone', e.target.value)}
                        placeholder="Phone"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                        data-testid={`bulk-phone-${index}`}
                      />
                    </div>
                    {bulkContacts.length > 1 && (
                      <button onClick={() => removeBulkRow(index)} className="mt-2 p-2 text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={addBulkRow}
                data-testid="add-row-btn"
                className="w-full py-3 mt-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Another Contact
              </button>

              <button
                onClick={handleBulkAdd}
                data-testid="submit-bulk-btn"
                className="w-full py-4 mt-4 bg-gray-900 text-white font-semibold rounded-xl"
              >
                Add {bulkContacts.filter(c => c.contact_name && c.contact_phone).length} Contact(s)
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Add Note Sheet */}
      <Drawer.Root open={!!showAddNote} onOpenChange={(open) => !open && setShowAddNote(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] outline-none max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Add Follow-up Note</h2>
              <p className="text-sm text-gray-500 mb-6">{showAddNote?.contact_name}</p>
              
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">What's the status?</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map(status => {
                    const Icon = status.icon;
                    const isSelected = newNote.status === status.id;
                    return (
                      <button key={status.id} type="button"
                        onClick={() => setNewNote({ ...newNote, status: status.id })}
                        className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                          isSelected ? `${status.bg} border-current ${status.color}` : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{status.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Feedback/Notes</label>
                <textarea value={newNote.feedback} onChange={(e) => setNewNote({ ...newNote, feedback: e.target.value })} placeholder="What did they say?" rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none" />
              </div>
              
              {(newNote.status === 'reschedule' || newNote.status === 'followup_again') && (
                <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm font-medium text-amber-800 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Schedule Next Follow-up
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Date</label>
                      <input type="date" value={newNote.next_date} onChange={(e) => setNewNote({ ...newNote, next_date: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white" min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Time</label>
                      <input type="time" value={newNote.next_time} onChange={(e) => setNewNote({ ...newNote, next_time: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white" />
                    </div>
                  </div>
                </div>
              )}
              
              <button onClick={() => handleAddNote(showAddNote?.id)} className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg">
                Save Note
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* History Sheet */}
      <Drawer.Root open={!!showHistory} onOpenChange={(open) => !open && setShowHistory(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[1001]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[1002] outline-none max-h-[85vh] overflow-y-auto">
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">{showHistory?.contact_name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{showHistory?.contact_name}</h2>
                  <p className="text-sm text-gray-500">{showHistory?.contact_phone}</p>
                </div>
              </div>
              
              <p className="text-sm font-medium text-gray-700 mb-4">Follow-up History</p>
              <div className="space-y-4">
                {showHistory?.history?.map((h, i) => {
                  const statusInfo = getStatusInfo(h.status);
                  const Icon = statusInfo?.icon || Clock;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo?.bg}`}>
                        <Icon className={`w-4 h-4 ${statusInfo?.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${statusInfo?.color}`}>{statusInfo?.label}</span>
                          <span className="text-xs text-gray-400">{formatDateTime(h.date)}</span>
                        </div>
                        {h.notes && <p className="text-sm text-gray-600 mt-1">{h.notes}</p>}
                        {h.next_follow_up && <p className="text-xs text-gray-400 mt-1">Scheduled: {formatDateTime(h.next_follow_up)}</p>}
                      </div>
                    </div>
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

export default FollowUps;
