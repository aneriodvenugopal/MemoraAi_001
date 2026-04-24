import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Edit3, Trash2, Save, X, Loader2, Search, Briefcase,
  ChevronDown, ChevronRight, Clock, IndianRupee, AlertCircle, CheckCircle2
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CategoriesAdmin() {
  const navigate = useNavigate();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showNewCat, setShowNewCat] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const authOnly = { Authorization: `Bearer ${token}` };

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/categories?include_inactive=1`, { headers: authOnly });
      if (r.ok) setCats((await r.json()).categories || []);
    } catch (e) { /* noop */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const deleteCat = async (slug) => {
    if (!window.confirm("Delete this category? System-seeded ones will be soft-deleted (deactivated).")) return;
    const r = await fetch(`${API}/memoraai/saas-admin/categories/${slug}`, { method: "DELETE", headers: authOnly });
    if (r.ok) { showToast("success", "Category removed"); load(); } else { showToast("error", "Delete failed"); }
  };

  const toggleActive = async (cat) => {
    const r = await fetch(`${API}/memoraai/saas-admin/categories/${cat.slug}`, {
      method: "PUT", headers, body: JSON.stringify({ is_active: !cat.is_active }),
    });
    if (r.ok) { showToast("success", cat.is_active ? "Category paused" : "Category activated"); load(); }
  };

  const filtered = cats.filter(c =>
    !search.trim() ||
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.slug || "").includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50" data-testid="categories-admin">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/saas-admin")} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-sky-600" /> Business Categories
            </h1>
            <p className="text-xs text-gray-500">Add industries & default services the AI proposes to every new client.</p>
          </div>
          <button onClick={() => setShowNewCat(true)} className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg shadow-md shadow-sky-600/30" data-testid="add-category-btn">
            <Plus className="w-4 h-4" /> New Category
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="categories-search" />
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <Briefcase className="w-10 h-10 text-sky-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">No categories yet</p>
            <button onClick={() => setShowNewCat(true)} className="mt-2 inline-flex items-center gap-1 bg-sky-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
              <Plus className="w-3 h-3" /> Add First Category
            </button>
          </div>
        ) : (
          <div className="space-y-2" data-testid="categories-list">
            {filtered.map(cat => (
              <CategoryRow
                key={cat.slug}
                cat={cat}
                expanded={!!expanded[cat.slug]}
                onToggle={() => setExpanded(e => ({ ...e, [cat.slug]: !e[cat.slug] }))}
                onEdit={() => setEditingCat(cat)}
                onDelete={() => deleteCat(cat.slug)}
                onToggleActive={() => toggleActive(cat)}
                onServicesChanged={load}
                headers={headers}
                authOnly={authOnly}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </main>

      {showNewCat && (
        <CategoryFormModal
          onClose={() => setShowNewCat(false)}
          onSaved={() => { setShowNewCat(false); load(); showToast("success", "Category created"); }}
          headers={headers}
          mode="create"
        />
      )}
      {editingCat && (
        <CategoryFormModal
          onClose={() => setEditingCat(null)}
          onSaved={() => { setEditingCat(null); load(); showToast("success", "Category updated"); }}
          headers={headers}
          mode="edit"
          initial={editingCat}
        />
      )}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`} data-testid={`toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}

function CategoryRow({ cat, expanded, onToggle, onEdit, onDelete, onToggleActive, onServicesChanged, headers, authOnly, showToast }) {
  const [addingSvc, setAddingSvc] = useState(false);
  const [editingSvc, setEditingSvc] = useState(null);
  const services = cat.default_services || [];

  const deleteSvc = async (svc) => {
    if (!window.confirm(`Delete "${svc.name}"?`)) return;
    const r = await fetch(`${API}/memoraai/saas-admin/categories/${cat.slug}/services/${svc.id}`, { method: "DELETE", headers: authOnly });
    if (r.ok) { showToast("success", "Service removed"); onServicesChanged(); }
  };

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden ${cat.is_active ? "border-gray-200" : "border-gray-200 opacity-60"}`} data-testid={`cat-${cat.slug}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <button onClick={onToggle} className="p-1 text-gray-400 hover:text-sky-600" data-testid={`toggle-${cat.slug}`}>
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-5 h-5 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
            <code className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{cat.slug}</code>
            {cat.is_system && <span className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold">System</span>}
            {!cat.is_active && <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">Paused</span>}
            <span className="text-[10px] text-gray-500">{services.length} services</span>
          </div>
          {cat.description && <p className="text-xs text-gray-500 truncate mt-0.5">{cat.description}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggleActive} className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${cat.is_active ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`} data-testid={`toggle-active-${cat.slug}`}>
            {cat.is_active ? "Pause" : "Activate"}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-sky-50 text-gray-500 hover:text-sky-700" data-testid={`edit-cat-${cat.slug}`}>
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500" data-testid={`delete-cat-${cat.slug}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-2" data-testid={`services-${cat.slug}`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Default Services ({services.length})</p>
            <button onClick={() => setAddingSvc(true)} className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700" data-testid={`add-svc-${cat.slug}`}>
              <Plus className="w-3 h-3" /> Add Service
            </button>
          </div>
          {services.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No services yet. Add the first one above.</p>
          ) : (
            <ul className="space-y-1.5">
              {services.map(s => (
                <li key={s.id} className="bg-white rounded-lg p-3 flex items-start gap-3" data-testid={`svc-${s.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                    {s.description && <p className="text-[11px] text-gray-500 mt-0.5">{s.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      {s.duration_mins > 0 && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {s.duration_mins}m</span>}
                      {s.price > 0 && <span className="flex items-center gap-0.5"><IndianRupee className="w-3 h-3" /> {s.price}</span>}
                    </div>
                  </div>
                  <button onClick={() => setEditingSvc(s)} className="p-1.5 rounded-lg hover:bg-sky-50 text-gray-400 hover:text-sky-600" data-testid={`edit-svc-${s.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteSvc(s)} className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500" data-testid={`delete-svc-${s.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
          {(addingSvc || editingSvc) && (
            <ServiceFormModal
              slug={cat.slug}
              onClose={() => { setAddingSvc(false); setEditingSvc(null); }}
              onSaved={() => { setAddingSvc(false); setEditingSvc(null); onServicesChanged(); showToast("success", "Service saved"); }}
              headers={headers}
              initial={editingSvc}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CategoryFormModal({ onClose, onSaved, headers, mode, initial }) {
  const [form, setForm] = useState({
    slug: initial?.slug || "",
    name: initial?.name || "",
    icon: initial?.icon || "briefcase",
    description: initial?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true); setError("");
    try {
      const url = mode === "create"
        ? `${API}/memoraai/saas-admin/categories`
        : `${API}/memoraai/saas-admin/categories/${initial.slug}`;
      const method = mode === "create" ? "POST" : "PUT";
      const body = mode === "create"
        ? { slug: form.slug, name: form.name, icon: form.icon, description: form.description }
        : { name: form.name, icon: form.icon, description: form.description };
      const r = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Save failed");
      onSaved();
    } catch (e) { setError(e.message || String(e)); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="category-form-modal">
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-3 text-white flex items-center justify-between">
          <h2 className="font-bold">{mode === "create" ? "New Category" : "Edit Category"}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2 rounded-lg flex gap-1.5"><AlertCircle className="w-3.5 h-3.5 mt-0.5" />{error}</div>}
          {mode === "create" && (
            <F label="Slug (url-safe key, e.g., software_it) *">
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="software_it" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="cat-slug" />
            </F>
          )}
          <F label="Display Name *">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Software / IT Services" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="cat-name" />
          </F>
          <F label="Icon (lucide icon name, optional)">
            <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="code, briefcase, sparkles..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="cat-icon" />
          </F>
          <F label="Description">
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description of what businesses in this category do." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="cat-desc" />
          </F>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name.trim() || (mode === "create" && !form.slug.trim())} className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50" data-testid="save-cat-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceFormModal({ slug, onClose, onSaved, headers, initial }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    duration_mins: initial?.duration_mins || 0,
    price: initial?.price || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true); setError("");
    try {
      const url = isEdit
        ? `${API}/memoraai/saas-admin/categories/${slug}/services/${initial.id}`
        : `${API}/memoraai/saas-admin/categories/${slug}/services`;
      const r = await fetch(url, { method: isEdit ? "PUT" : "POST", headers, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Save failed");
      onSaved();
    } catch (e) { setError(e.message || String(e)); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="service-form-modal">
      <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm">{isEdit ? "Edit Service" : "New Service"}</h2>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2 rounded-lg">{error}</div>}
          <F label="Service Name *">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="E.g., Web Development" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="svc-name" />
          </F>
          <F label="Description">
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description shown to customers" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="svc-desc" />
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Duration (mins)">
              <input type="number" value={form.duration_mins} onChange={e => setForm({ ...form, duration_mins: parseInt(e.target.value || 0) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="svc-duration" />
            </F>
            <F label="Default Price (₹)">
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value || 0) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" data-testid="svc-price" />
            </F>
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name.trim()} className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50" data-testid="save-svc-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-700 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
