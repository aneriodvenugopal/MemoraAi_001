import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Mic, Send, FileText, Image as ImageIcon, Video, Link2, HelpCircle,
  FileSpreadsheet, StickyNote, Briefcase, MapPin, X, Upload, Loader2,
  Search, SlidersHorizontal, MoreVertical, Sparkles, TrendingUp, Users,
  CheckCircle2, Bell, PlayCircle, Phone, Paperclip, Smile, ChevronRight,
  Trash2, Edit3
} from 'lucide-react';
import BusinessAdminLayout from '../layouts/BusinessAdminLayout';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_META = {
  note:       { icon: StickyNote,      color: 'sky',  label: 'Notes' },
  text:       { icon: FileText,        color: 'sky',  label: 'Text' },
  document:   { icon: FileText,        color: 'blue',    label: 'Document' },
  brochure:   { icon: FileText,        color: 'blue',    label: 'PDF' },
  pdf:        { icon: FileText,        color: 'red',     label: 'PDF' },
  image:      { icon: ImageIcon,       color: 'green',   label: 'Image' },
  video:      { icon: Video,           color: 'rose',    label: 'Video' },
  audio:      { icon: Mic,             color: 'sky',     label: 'Audio' },
  link:       { icon: Link2,           color: 'sky',     label: 'Link' },
  faq:        { icon: HelpCircle,      color: 'orange',  label: 'FAQ' },
  price_list: { icon: FileSpreadsheet, color: 'emerald', label: 'Price List' },
  template:   { icon: FileText,        color: 'blue',  label: 'Template' },
  service:    { icon: Briefcase,       color: 'blue',  label: 'Service' },
  address:    { icon: MapPin,          color: 'red',     label: 'Address' },
};

const COLOR_CLASSES = {
  sky: 'bg-sky-50 text-sky-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  purple: 'bg-purple-50 text-purple-600',
};

const PLUS_MENU = [
  { key: 'pdf',     label: 'Upload PDF / Document',  icon: FileText,        color: 'red',     accept: '.pdf,.doc,.docx' },
  { key: 'image',   label: 'Upload Image',            icon: ImageIcon,       color: 'green',   accept: 'image/*' },
  { key: 'voice',   label: 'Record Voice',            icon: Mic,             color: 'sky' },
  { key: 'video',   label: 'Upload Video',            icon: Video,           color: 'rose',    accept: 'video/*' },
  { key: 'youtube', label: 'Add YouTube Link',        icon: Video,           color: 'rose' },
  { key: 'link',    label: 'Add Website Link',        icon: Link2,           color: 'blue' },
  { key: 'faq',     label: 'Add FAQ',                 icon: HelpCircle,      color: 'orange' },
  { key: 'price',   label: 'Add Price List',          icon: FileSpreadsheet, color: 'emerald', accept: '.xlsx,.xls,.csv' },
  { key: 'note',    label: 'Add Notes',               icon: StickyNote,      color: 'sky' },
  { key: 'service', label: 'Add Services',            icon: Briefcase,       color: 'blue' },
  { key: 'address', label: 'Add Address',             icon: MapPin,          color: 'red' },
];

const SAMPLE_CHAT = [
  { from: 'customer', text: 'Good morning, skin doctor timings?',   time: '10:30 AM' },
  { from: 'ai', text: 'Good morning 👋\nDr. Priya (Skin Specialist) is available from 10:00 AM to 2:00 PM today.', time: '10:30 AM' },
  { from: 'customer', text: 'Consultation fees?', time: '10:31 AM' },
  { from: 'ai', text: 'Consultation fee is ₹500.\nWould you like to book an appointment?', time: '10:31 AM' },
  { from: 'customer', text: 'Yes, tomorrow 11 AM.', time: '10:32 AM' },
  { from: 'ai', text: '✅ Appointment booked for tomorrow at 11:00 AM with Dr. Priya.', time: '10:32 AM' },
];

export default function OwnBusinessGPT() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [plusOpen, setPlusOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'faq'|'link'|'price'|'voice'|'service'|'address'
  const [kb, setKb] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const [fileAccept, setFileAccept] = useState('');
  const [pendingType, setPendingType] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const authOnly = { Authorization: `Bearer ${token}` };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [listR, sumR] = await Promise.all([
        fetch(`${API}/memoraai/content?limit=50`, { headers: authOnly }).then(r => r.ok ? r.json() : { items: [] }),
        fetch(`${API}/memoraai/knowledge/summary`, { headers: authOnly }).then(r => r.ok ? r.json() : null),
      ]);
      setKb(listR.items || []);
      setSummary(sumR);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handlePlusPick = (item) => {
    setPlusOpen(false);
    if (item.accept) {
      setFileAccept(item.accept);
      setPendingType(item.key);
      setTimeout(() => fileRef.current?.click(), 100);
    } else {
      setActiveModal(item.key);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name.replace(/\.[^/.]+$/, ''));

      const xhr = new XMLHttpRequest();
      const endpoint = pendingType === 'pdf' || pendingType === 'image'
        ? `${API}/memoraai/knowledge/extract`
        : `${API}/files/upload`;
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Authorization', authOnly.Authorization);
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.onload = async () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          if (pendingType === 'pdf' || pendingType === 'image') {
            showToast('success', `AI learned ${data.char_count || 0} characters from your file`);
          } else {
            // For price list / video — create a content library entry with the uploaded URL
            await fetch(`${API}/memoraai/content`, {
              method: 'POST', headers,
              body: JSON.stringify({
                title: file.name.replace(/\.[^/.]+$/, ''),
                content_type: pendingType === 'price' ? 'price_list' : pendingType,
                url: data.file_url || data.url || '',
                file_name: data.filename || file.name,
                file_size: file.size,
                mime_type: file.type,
                description: '',
                tags: ['kb', pendingType],
              }),
            });
            showToast('success', 'Uploaded and added to AI knowledge');
          }
          loadAll();
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            showToast('error', err.detail || 'Upload failed');
          } catch { showToast('error', 'Upload failed'); }
        }
      };
      xhr.onerror = () => { setUploading(false); showToast('error', 'Network error'); };
      xhr.send(fd);
    } catch (e) { setUploading(false); showToast('error', 'Upload error'); }
  };

  const trainText = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/memoraai/knowledge/text`, {
        method: 'POST', headers,
        body: JSON.stringify({
          title: text.split(/\s+/).slice(0, 8).join(' ').slice(0, 60) || 'Untitled note',
          text: text,
        }),
      });
      if (r.ok) {
        showToast('success', 'AI trained on your content');
        setText('');
        loadAll();
      } else showToast('error', 'Could not save');
    } catch (e) { showToast('error', 'Save failed'); }
    setSaving(false);
  };

  const saveFAQ = async (q, a) => {
    setSaving(true);
    await fetch(`${API}/memoraai/content`, {
      method: 'POST', headers,
      body: JSON.stringify({ title: q, content_type: 'faq', description: a, tags: ['faq', 'kb'] }),
    });
    setSaving(false);
    setActiveModal(null);
    showToast('success', 'FAQ added to knowledge base');
    loadAll();
  };

  const saveLink = async (url, title) => {
    setSaving(true);
    await fetch(`${API}/memoraai/content`, {
      method: 'POST', headers,
      body: JSON.stringify({ title: title || url, content_type: 'link', url, description: '', tags: ['link', 'kb'] }),
    });
    setSaving(false);
    setActiveModal(null);
    showToast('success', 'Website link added');
    loadAll();
  };

  const saveGeneric = async (payload) => {
    setSaving(true);
    await fetch(`${API}/memoraai/content`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    });
    setSaving(false);
    setActiveModal(null);
    showToast('success', 'Saved');
    loadAll();
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this knowledge item? The AI will stop using it immediately.')) return;
    try {
      const r = await fetch(`${API}/memoraai/content/${id}`, { method: 'DELETE', headers: authOnly });
      if (r.ok) {
        showToast('success', 'Deleted');
        setKb(prev => prev.filter(it => it.id !== id));
        loadAll();
      } else {
        const err = await r.json().catch(() => ({}));
        showToast('error', err.detail || 'Delete failed');
      }
    } catch (e) { showToast('error', 'Delete failed'); }
  };

  const filtered = kb.filter(it =>
    !search.trim() ||
    (it.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (it.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BusinessAdminLayout
      pageTitle="Own Business GPT"
      pageSubtitle="Add your business content in any format. AI learns and replies like your expert."
      headerRight={
        <>
          <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-sky-300 px-3 py-2 rounded-xl transition-colors" data-testid="how-it-works-btn">
            <PlayCircle className="w-4 h-4 text-sky-600" /> How it works
          </button>
          <button className="relative p-2 text-gray-500 hover:text-sky-600 transition-colors" data-testid="notifications-btn">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
          </button>
        </>
      }
    >
      {/* Hidden file input */}
      <input
        ref={fileRef} type="file" accept={fileAccept}
        onChange={e => handleFile(e.target.files?.[0])}
        className="hidden" data-testid="hidden-file-input"
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
          data-testid={`toast-${toast.type}`}
        >
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] gap-6" data-testid="own-business-gpt-grid">
        {/* ═══════ CENTER COLUMN ═══════ */}
        <div className="space-y-6 min-w-0">
          {/* Trainer Box */}
          <section className="bg-white rounded-3xl border border-gray-200/70 p-5 lg:p-6 shadow-sm" data-testid="trainer-box">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-gray-900 text-lg">Add knowledge to train your AI</h2>
                <p className="text-xs text-gray-500 mt-0.5">Type, upload, record or paste anything about your business — AI will learn it.</p>
              </div>
            </div>

            {/* Input box */}
            <div className="relative border-2 border-gray-200 hover:border-sky-300 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100 transition-all rounded-2xl p-3">
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder="Type your content here... (e.g., 'Our clinic is open 10am–8pm. Dr. Priya handles skin issues. Fees: ₹500.')"
                className="w-full min-h-[80px] max-h-[260px] resize-none bg-transparent outline-none text-gray-800 text-sm leading-relaxed pr-28 placeholder:text-gray-400"
                data-testid="trainer-textarea"
              />
              <div className="flex items-center justify-between pt-2">
                {/* Plus button */}
                <div className="relative">
                  <button
                    onClick={() => setPlusOpen(v => !v)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${plusOpen ? 'bg-sky-600 text-white rotate-45' : 'bg-gray-100 hover:bg-sky-50 text-gray-600 hover:text-sky-600'}`}
                    data-testid="plus-menu-btn"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  {plusOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setPlusOpen(false)} />
                      <div className="absolute top-full mt-2 left-0 bg-white rounded-2xl border border-gray-200 shadow-2xl py-2 w-[280px] z-40 max-h-[80vh] overflow-y-auto" data-testid="plus-menu">
                        {PLUS_MENU.map(item => {
                          const cls = COLOR_CLASSES[item.color];
                          return (
                            <button
                              key={item.key}
                              onClick={() => handlePlusPick(item)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                              data-testid={`plus-item-${item.key}`}
                            >
                              <div className={`w-8 h-8 rounded-lg ${cls.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                                <item.icon className={`w-4 h-4 ${cls.split(' ')[1]}`} />
                              </div>
                              <span className="text-sm font-medium text-gray-700">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-sky-50 text-gray-500 hover:text-sky-600 flex items-center justify-center transition-all" data-testid="mic-btn" title="Record voice">
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={trainText}
                    disabled={!text.trim() || saving}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    data-testid="train-btn"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Add / Train
                  </button>
                </div>
              </div>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="mt-3 bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3" data-testid="upload-progress">
                <Loader2 className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-sky-900">Uploading & teaching AI...</p>
                  <div className="w-full bg-sky-100 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
                <span className="text-xs font-semibold text-sky-700">{uploadProgress}%</span>
              </div>
            )}
          </section>

          {/* Knowledge Base */}
          <section className="bg-white rounded-3xl border border-gray-200/70 overflow-hidden shadow-sm" data-testid="knowledge-base">
            <div className="px-5 lg:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900 text-lg">Your Knowledge Base</h2>
                  <span className="text-[10px] bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-full">
                    {summary?.total ?? 0} Items
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Everything your AI has learned from you.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search content..."
                    className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 w-full sm:w-56"
                    data-testid="kb-search"
                  />
                </div>
                <button className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:border-sky-300 hover:text-sky-600 transition-colors" data-testid="kb-filter">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-gray-100" />
                    <div className="flex-1 h-4 bg-gray-100 rounded" />
                    <div className="w-16 h-6 bg-gray-100 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center" data-testid="kb-empty">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-7 h-7 text-sky-500" />
                </div>
                <h3 className="font-semibold text-gray-900">Train your AI — your team of one</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Type a paragraph about your services, upload a brochure, or add an FAQ above. The AI will start using it in WhatsApp replies instantly.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50" data-testid="kb-list">
                {filtered.map(it => {
                  const meta = TYPE_META[it.content_type] || TYPE_META.document;
                  const cls = COLOR_CLASSES[meta.color];
                  const Icon = meta.icon;
                  const date = it.created_at ? new Date(it.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                  return (
                    <div key={it.id} className="px-5 lg:px-6 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors group" data-testid={`kb-item-${it.id}`}>
                      <div className={`w-10 h-10 rounded-xl ${cls.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${cls.split(' ')[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{it.title}</p>
                        {it.description && !['faq', 'note'].includes(it.content_type) && (
                          <p className="text-[11px] text-gray-500 truncate">{it.description.slice(0, 100)}</p>
                        )}
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-md flex-shrink-0">
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-gray-400 hidden sm:inline flex-shrink-0">{date}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <button onClick={() => deleteItem(it.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500" data-testid={`kb-delete-${it.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="px-5 lg:px-6 py-3 border-t border-gray-50 text-center">
                <button onClick={() => navigate('/content-library')} className="text-xs font-semibold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1" data-testid="view-all-content">
                  View All Content <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </section>

          {/* Stats row */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4" data-testid="stats-row">
            <StatCard label="Total Content" value={summary?.total ?? 0} suffix="Items" sub={`+${summary?.this_week ?? 0} this week`} color="sky" icon={FileText} />
            <StatCard label="AI Accuracy" value="92" suffix="%" sub="Improving daily" color="sky" icon={TrendingUp} />
            <StatCard label="Questions Answered" value="1,248" sub="This month" color="emerald" icon={CheckCircle2} />
            <StatCard label="Happy Customers" value="98" suffix="%" sub="Satisfaction" color="orange" icon={Users} />
          </section>
        </div>

        {/* ═══════ RIGHT COLUMN — WhatsApp Preview ═══════ */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start" data-testid="whatsapp-preview">
          <div className="bg-white rounded-3xl border border-gray-200/70 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-[#25D366]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Live WhatsApp Preview</p>
                <p className="text-[11px] text-gray-500">See how your AI talks to customers</p>
              </div>
            </div>

            {/* WA mockup */}
            <div className="p-3">
              <div className="rounded-2xl overflow-hidden border border-gray-200">
                {/* Chat header */}
                <div className="bg-[#075E54] px-3 py-2.5 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                    {(user?.name || 'B')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-white text-xs font-semibold truncate">{user?.name || 'Your Business'}</span>
                      <CheckCircle2 className="w-3 h-3 text-green-300" />
                    </div>
                    <span className="text-[9px] text-green-200">Business Account</span>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="h-[380px] overflow-y-auto p-3 space-y-2" style={{ background: '#eae6df' }}>
                  <div className="flex justify-center">
                    <span className="text-[9px] bg-white/70 text-gray-600 px-2 py-0.5 rounded-full">Today</span>
                  </div>
                  {SAMPLE_CHAT.map((m, i) => (
                    <div key={i} className={`flex ${m.from === 'customer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-lg text-[12px] whitespace-pre-line leading-relaxed ${
                        m.from === 'customer' ? 'bg-[#dcf8c6] text-gray-800 rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                      }`}>
                        {m.text}
                        <div className="text-[8px] text-gray-500 text-right mt-0.5">{m.time} {m.from === 'customer' && '✓✓'}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat composer */}
                <div className="bg-[#f0f2f5] px-2.5 py-2 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-gray-500" />
                  <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-gray-400">Type a message</div>
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center">
                    <Mic className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Behavior card */}
          <div className="bg-white rounded-3xl border border-gray-200/70 p-5 shadow-sm" data-testid="ai-behavior-card">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-900 text-sm">AI Behavior Settings</p>
              <button onClick={() => navigate('/business-rules')} className="text-xs font-semibold text-sky-600 hover:text-sky-700" data-testid="edit-behavior">Edit</button>
            </div>
            <dl className="space-y-2.5 text-xs">
              <Row label="Tone" value="Friendly & Professional" />
              <Row label="Language" value="English, Telugu, Hindi" />
              <Row label="Response Length" value="Medium" />
              <Row label="AI Personality" value="Helpful Assistant" />
            </dl>
          </div>
        </aside>
      </div>

      {/* ═══════ MODALS ═══════ */}
      {activeModal === 'faq' && <FAQModal onClose={() => setActiveModal(null)} onSave={saveFAQ} saving={saving} />}
      {activeModal === 'link' && <LinkModal onClose={() => setActiveModal(null)} onSave={saveLink} saving={saving} />}
      {activeModal === 'youtube' && <LinkModal title="Add YouTube Link" onClose={() => setActiveModal(null)} onSave={(url, t) => saveGeneric({ title: t || 'YouTube Video', content_type: 'video', url, description: '', tags: ['kb', 'youtube', 'video'] })} saving={saving} />}
      {activeModal === 'note' && <NoteModal onClose={() => setActiveModal(null)} onSave={(data) => saveGeneric({ title: data.title, content_type: 'note', description: data.text, tags: ['kb','note'] })} saving={saving} />}
      {activeModal === 'service' && <NoteModal title="Add Service" placeholder="E.g., Dental cleaning — ₹800, takes 30 mins, available Mon-Sat 10am–7pm" onClose={() => setActiveModal(null)} onSave={(data) => saveGeneric({ title: data.title, content_type: 'note', description: data.text, tags: ['kb','service'] })} saving={saving} />}
      {activeModal === 'address' && <NoteModal title="Add Address" placeholder="E.g., 3rd floor, Park Hyatt Towers, Banjara Hills, Hyderabad, 500034. Google Maps link: https://..." onClose={() => setActiveModal(null)} onSave={(data) => saveGeneric({ title: data.title || 'Business Address', content_type: 'note', description: data.text, tags: ['kb','address'] })} saving={saving} />}
      {activeModal === 'voice' && <VoiceModal onClose={() => setActiveModal(null)} />}
    </BusinessAdminLayout>
  );
}

/* ─── Sub components ─── */
function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-semibold text-gray-800 text-right">{value}</dd>
    </div>
  );
}

function StatCard({ label, value, suffix, sub, color = 'sky', icon: Icon }) {
  const cls = COLOR_CLASSES[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-4 shadow-sm" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${cls.split(' ')[0]} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${cls.split(' ')[1]}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</span>
        {suffix && <span className="text-sm text-gray-500 font-semibold">{suffix}</span>}
      </div>
      {sub && <p className="text-[10px] text-emerald-600 font-medium mt-1">{sub}</p>}
    </div>
  );
}

function FAQModal({ onClose, onSave, saving }) {
  const [q, setQ] = useState(''); const [a, setA] = useState('');
  return (
    <ModalShell title="Add FAQ" icon={HelpCircle} color="orange" onClose={onClose}>
      <label className="block mb-3">
        <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Question</span>
        <input value={q} onChange={e => setQ(e.target.value)} required placeholder="E.g., What are your consultation fees?" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="faq-question" />
      </label>
      <label className="block mb-4">
        <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Answer</span>
        <textarea value={a} onChange={e => setA(e.target.value)} required rows={4} placeholder="E.g., General consultation is ₹500. Follow-up within 7 days is free." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="faq-answer" />
      </label>
      <ModalActions onClose={onClose} onSave={() => onSave(q, a)} saving={saving} disabled={!q.trim() || !a.trim()} />
    </ModalShell>
  );
}

function LinkModal({ onClose, onSave, saving, title = 'Add Website Link' }) {
  const [url, setUrl] = useState(''); const [t, setT] = useState('');
  return (
    <ModalShell title={title} icon={Link2} color="blue" onClose={onClose}>
      <label className="block mb-3">
        <span className="text-[11px] font-semibold text-gray-600 mb-1 block">URL</span>
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} required placeholder={title.includes('YouTube') ? 'https://youtube.com/watch?v=...' : 'https://your-website.com'} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="link-url" />
      </label>
      <label className="block mb-4">
        <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Title (optional)</span>
        <input value={t} onChange={e => setT(e.target.value)} placeholder="E.g., Our services page" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="link-title" />
      </label>
      <ModalActions onClose={onClose} onSave={() => onSave(url, t)} saving={saving} disabled={!url.trim()} />
    </ModalShell>
  );
}

function NoteModal({ onClose, onSave, saving, title = 'Add Notes', placeholder = 'Write long-form notes about your business — SOPs, policies, anything your staff would tell a customer…' }) {
  const [t, setT] = useState(''); const [text, setText] = useState('');
  return (
    <ModalShell title={title} icon={StickyNote} color="sky" onClose={onClose}>
      <label className="block mb-3">
        <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Title</span>
        <input value={t} onChange={e => setT(e.target.value)} required placeholder="E.g., Return policy" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="note-title" />
      </label>
      <label className="block mb-4">
        <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Content</span>
        <textarea value={text} onChange={e => setText(e.target.value)} required rows={10} placeholder={placeholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" style={{ minHeight: 220 }} data-testid="note-content" />
        <p className="text-[10px] text-gray-400 mt-1">{text.length} characters</p>
      </label>
      <ModalActions onClose={onClose} onSave={() => onSave({ title: t, text })} saving={saving} disabled={!t.trim() || !text.trim()} />
    </ModalShell>
  );
}

function VoiceModal({ onClose }) {
  return (
    <ModalShell title="Record Voice" icon={Mic} color="sky" onClose={onClose}>
      <div className="py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
          <Mic className="w-7 h-7 text-sky-600" />
        </div>
        <p className="text-sm text-gray-700 font-medium">Voice recording coming soon</p>
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">For now, upload an audio file using the Upload Video option — we accept all audio formats too.</p>
      </div>
      <button onClick={onClose} className="w-full py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Close</button>
    </ModalShell>
  );
}

function ModalShell({ title, icon: Icon, color = 'sky', children, onClose }) {
  const cls = COLOR_CLASSES[color];
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="kb-modal">
      <form onClick={e => { e.stopPropagation(); e.preventDefault(); }} className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${cls.split(' ')[0]} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${cls.split(' ')[1]}`} />
          </div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="ml-auto p-1 text-gray-400 hover:text-gray-700" data-testid="modal-close"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </form>
    </div>
  );
}

function ModalActions({ onClose, onSave, saving, disabled }) {
  return (
    <div className="flex gap-2 pt-1">
      <button onClick={onClose} type="button" className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100" data-testid="modal-cancel">Cancel</button>
      <button onClick={onSave} type="button" disabled={saving || disabled}
        className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
        data-testid="modal-save">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Save & Train
      </button>
    </div>
  );
}
