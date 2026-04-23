import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Brain, Plus, Edit3, Trash2, PlayCircle, PauseCircle,
  Search, Loader2, TrendingUp, AlertCircle, CheckCircle2, X, Save,
  MessageSquare, Sparkles
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_LABELS = {
  general: 'General', pricing: 'Pricing', policy: 'Policy', tone: 'Tone',
  fact: 'Fact', booking: 'Booking', product: 'Product', hours: 'Hours',
};

export default function ChatCorrections() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        fetch(`${API}/memoraai/corrections?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`, { headers }).then(r => r.ok ? r.json() : { corrections: [] }),
        fetch(`${API}/memoraai/corrections/stats/summary`, { headers }).then(r => r.ok ? r.json() : null),
      ]);
      setItems(listRes.corrections || []);
      setSummary(sumRes);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, search]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this correction? The AI will forget it.')) return;
    const r = await fetch(`${API}/memoraai/corrections/${id}`, { method: 'DELETE', headers });
    if (r.ok) { showToast('success', 'Correction deleted'); loadAll(); }
  };

  const handleToggle = async (id) => {
    const r = await fetch(`${API}/memoraai/corrections/${id}/toggle`, { method: 'POST', headers });
    if (r.ok) { loadAll(); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10" data-testid="chat-corrections-page">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-sky-600" />
              Chat Learning
            </h1>
            <p className="text-xs text-gray-500">Train your AI with corrections — it learns from every one</p>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
            data-testid="new-correction-btn">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-3" data-testid="summary-cards">
            <SummaryCard label="Corrections" value={summary.total} icon={Brain} color="bg-sky-50 text-sky-700" />
            <SummaryCard label="Active" value={summary.active} icon={CheckCircle2} color="bg-green-50 text-green-700" />
            <SummaryCard label="Times Applied" value={summary.times_applied} icon={TrendingUp} color="bg-blue-50 text-blue-700" />
          </div>
        )}

        {/* How it works */}
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4 flex gap-3" data-testid="info-banner">
          <Sparkles className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-sky-900 leading-relaxed">
            <strong>How it works:</strong> When the AI replies incorrectly in Team Inbox, click <em>Correct AI</em> on
            that message and explain the right answer. MemoraAI injects your corrections into every future reply —
            so the bot gets smarter about <em>your business</em> automatically.
          </div>
        </div>

        {/* Search */}
        <div className="relative" data-testid="search-bar">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search corrections by keyword, topic..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100" data-testid="empty-state">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-700">No corrections yet</h3>
            <p className="text-xs text-gray-400 mt-1">Start in Team Inbox — click "Correct AI" on any AI reply.</p>
            <button onClick={() => navigate('/team-inbox')}
              className="mt-4 bg-sky-500 text-white text-xs font-medium px-4 py-2 rounded-lg"
              data-testid="go-inbox-btn">
              Open Team Inbox
            </button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="corrections-list">
            {items.map(c => (
              <CorrectionCard key={c.id} correction={c}
                onEdit={() => { setEditing(c); setShowForm(true); }}
                onDelete={() => handleDelete(c.id)}
                onToggle={() => handleToggle(c.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <CorrectionForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={async (payload) => {
            const url = editing
              ? `${API}/memoraai/corrections/${editing.id}`
              : `${API}/memoraai/corrections`;
            const method = editing ? 'PUT' : 'POST';
            const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (r.ok) {
              showToast('success', editing ? 'Correction updated' : 'Correction saved — AI will apply it');
              setShowForm(false); setEditing(null); loadAll();
            } else {
              showToast('error', 'Save failed');
            }
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-3 border border-gray-100" data-testid={`summary-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className={`w-8 h-8 rounded-lg ${color.split(' ')[0]} flex items-center justify-center mb-1.5`}>
        <Icon className={`w-4 h-4 ${color.split(' ')[1]}`} />
      </div>
      <p className="text-lg font-bold text-gray-900">{value ?? 0}</p>
      <p className="text-[10px] text-gray-400 font-medium">{label}</p>
    </div>
  );
}

function CorrectionCard({ correction: c, onEdit, onDelete, onToggle }) {
  return (
    <div className={`bg-white rounded-2xl p-4 border ${c.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`} data-testid={`correction-${c.id}`}>
      <div className="flex items-start gap-2 mb-2">
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase ${c.is_active ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'}`}>
          {CATEGORY_LABELS[c.category] || c.category || 'General'}
        </span>
        {c.times_applied > 0 && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
            Applied {c.times_applied}×
          </span>
        )}
        <div className="flex-1" />
        <button onClick={onToggle} className="text-gray-400 hover:text-sky-600" title={c.is_active ? 'Pause' : 'Activate'} data-testid={`toggle-${c.id}`}>
          {c.is_active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
        </button>
        <button onClick={onEdit} className="text-gray-400 hover:text-sky-600" data-testid={`edit-${c.id}`}>
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="text-gray-400 hover:text-red-600" data-testid={`delete-${c.id}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {c.original_message && (
        <div className="mb-2">
          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Customer said</p>
          <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{c.original_message}</p>
        </div>
      )}

      {c.ai_response && (
        <div className="mb-2">
          <p className="text-[10px] text-red-400 uppercase font-semibold mb-1">AI replied (incorrect)</p>
          <p className="text-xs text-gray-600 bg-red-50 rounded-lg px-3 py-2 line-through decoration-red-300">{c.ai_response}</p>
        </div>
      )}

      <div className="mb-2">
        <p className="text-[10px] text-sky-600 uppercase font-semibold mb-1">Correction</p>
        <p className="text-xs text-gray-800 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">{c.correction_note}</p>
      </div>

      {c.suggested_response && (
        <div className="mb-2">
          <p className="text-[10px] text-green-600 uppercase font-semibold mb-1">Preferred reply</p>
          <p className="text-xs text-gray-800 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{c.suggested_response}</p>
        </div>
      )}

      {c.keywords && c.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {c.keywords.slice(0, 8).map((k, i) => (
            <span key={i} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">#{k}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function CorrectionForm({ editing, onClose, onSave }) {
  const [form, setForm] = useState({
    original_message: editing?.original_message || '',
    ai_response: editing?.ai_response || '',
    correction_note: editing?.correction_note || '',
    suggested_response: editing?.suggested_response || '',
    category: editing?.category || 'general',
    keywords: (editing?.keywords || []).join(', '),
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.correction_note.trim()) return;
    setSaving(true);
    await onSave({
      original_message: form.original_message,
      ai_response: form.ai_response,
      correction_note: form.correction_note,
      suggested_response: form.suggested_response,
      category: form.category,
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose} data-testid="correction-form-modal">
      <form onSubmit={submit} onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{editing ? 'Edit Correction' : 'New Correction'}</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700" data-testid="close-form-btn">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <Field label="Customer's message (optional)">
            <textarea value={form.original_message} onChange={e => setForm({ ...form, original_message: e.target.value })}
              placeholder="E.g., What's the price of plot 204?"
              rows="2" className="form-ta" data-testid="input-original-message" />
          </Field>
          <Field label="What the AI said (optional)">
            <textarea value={form.ai_response} onChange={e => setForm({ ...form, ai_response: e.target.value })}
              placeholder="The incorrect AI reply"
              rows="2" className="form-ta" data-testid="input-ai-response" />
          </Field>
          <Field label="Correction / What should change *">
            <textarea value={form.correction_note} onChange={e => setForm({ ...form, correction_note: e.target.value })}
              placeholder="E.g., Always quote current promo price Rs.45L for plot 204, not old price."
              rows="3" required className="form-ta" data-testid="input-correction-note" />
          </Field>
          <Field label="Preferred reply example (optional)">
            <textarea value={form.suggested_response} onChange={e => setForm({ ...form, suggested_response: e.target.value })}
              placeholder="Exact phrasing the AI should use"
              rows="2" className="form-ta" data-testid="input-suggested-response" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="input-category">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Keywords (comma separated)">
              <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })}
                placeholder="price, plot, 204"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="input-keywords" />
            </Field>
          </div>
          <p className="text-[10px] text-gray-400 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Leave keywords empty — we'll auto-extract them from your correction.
          </p>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100" data-testid="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.correction_note.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-sky-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-sky-600 disabled:opacity-50" data-testid="save-correction-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editing ? 'Save Changes' : 'Save & Teach AI'}
          </button>
        </div>
        <style>{`.form-ta { width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; resize: vertical; }`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
