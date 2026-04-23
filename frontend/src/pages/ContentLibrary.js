import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, FileText, Image as ImageIcon, Video, Link2, HelpCircle,
  Tag, Trash2, Edit2, Share2, Search, X, Save, Upload, CheckCircle2,
  Loader2, FileUp, Sparkles, AlertCircle, Download
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CONTENT_TYPES = [
  { key: "brochure",   icon: FileText,    label: "Brochure",   desc: "PDF flyers, plot layouts",       accept: ".pdf,.doc,.docx",  color: "blue" },
  { key: "image",      icon: ImageIcon,   label: "Image",      desc: "Photos, banners",                 accept: "image/*",          color: "green" },
  { key: "video",      icon: Video,       label: "Video",      desc: "Walkthroughs, testimonials",      accept: "video/*",          color: "red" },
  { key: "price_list", icon: Tag,         label: "Price List", desc: "Current rates, offers",           accept: ".pdf,.xlsx,.xls", color: "emerald" },
  { key: "document",   icon: FileText,    label: "Document",   desc: "Any other file",                  accept: "*",                color: "gray" },
  { key: "link",       icon: Link2,       label: "Link",       desc: "YouTube, website URL",            accept: null,               color: "purple" },
  { key: "faq",        icon: HelpCircle,  label: "FAQ",        desc: "Text answers to common questions",accept: null,               color: "amber" },
  { key: "note",       icon: FileText,    label: "Long Note",  desc: "Long-form notes, SOPs, scripts",  accept: null,               color: "indigo", longText: true },
  { key: "template",   icon: FileText,    label: "Template",   desc: "Reusable message template",       accept: null,               color: "indigo" },
];

const COLOR_CLASSES = {
  blue:    "bg-blue-50 text-blue-600 border-blue-100",
  green:   "bg-green-50 text-green-600 border-green-100",
  red:     "bg-red-50 text-red-600 border-red-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  gray:    "bg-gray-50 text-gray-600 border-gray-100",
  purple:  "bg-purple-50 text-purple-600 border-purple-100",
  amber:   "bg-sky-50 text-sky-600 border-sky-100",
  indigo:  "bg-indigo-50 text-indigo-600 border-indigo-100",
};

const getTypeCfg = (key) => CONTENT_TYPES.find(t => t.key === key) || CONTENT_TYPES[4];

export default function ContentLibrary() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?content_type=${filter}` : "";
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API}/memoraai/content${params}`, { headers }).then(r => r.ok ? r.json() : { items: [] }),
        fetch(`${API}/memoraai/content/stats`, { headers }).then(r => r.ok ? r.json() : null),
      ]);
      setItems(itemsRes.items || []);
      setStats(statsRes);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this content? It will be removed from WhatsApp sharing.")) return;
    const r = await fetch(`${API}/memoraai/content/${id}`, { method: "DELETE", headers });
    if (r.ok) { showToast("success", "Deleted"); fetchData(); }
  };

  const shareItem = async (id) => {
    const r = await fetch(`${API}/memoraai/content/${id}/share`, { method: "POST", headers });
    if (r.ok) { showToast("success", "Share count updated"); fetchData(); }
  };

  const filteredItems = items.filter(it =>
    !search.trim() ||
    (it.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (it.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (it.tags || []).some(t => (t || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10" data-testid="content-library-page">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-500" />
              Content Library
            </h1>
            <p className="text-xs text-gray-500 truncate">Brochures, images, videos & links — all ready for WhatsApp</p>
          </div>
          <button
            onClick={() => { setEditItem(null); setShowAdd(true); }}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white px-3 py-2 rounded-lg text-sm font-semibold"
            data-testid="add-content-btn"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </header>

      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`} data-testid={`toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3" data-testid="stats-cards">
            <StatCard label="Total Items" value={stats.total} color="amber" />
            {Object.entries(stats.by_type || {}).slice(0, 3).map(([type, d]) => {
              const cfg = getTypeCfg(type);
              return <StatCard key={type} label={cfg.label} value={d.count} subLabel={`${d.shares} shares`} color={cfg.color} />;
            })}
          </div>
        )}

        {/* Search + Filter Pills */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search content by title, tag, description…"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              data-testid="search-input" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            <FilterPill active={!filter} label="All" onClick={() => setFilter("")} />
            {CONTENT_TYPES.map(t => (
              <FilterPill key={t.key} active={filter === t.key}
                label={t.label} icon={t.icon}
                onClick={() => setFilter(f => f === t.key ? "" : t.key)}
                testId={`filter-${t.key}`} />
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin mx-auto" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState onAdd={() => { setEditItem(null); setShowAdd(true); }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="content-grid">
            {filteredItems.map(it => (
              <ContentCard key={it.id} item={it}
                onEdit={() => { setEditItem(it); setShowAdd(true); }}
                onDelete={() => deleteItem(it.id)}
                onShare={() => shareItem(it.id)} />
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddContentModal
          editItem={editItem}
          onClose={() => { setShowAdd(false); setEditItem(null); }}
          onSaved={() => { setShowAdd(false); setEditItem(null); fetchData(); showToast("success", editItem ? "Content updated" : "Content added"); }}
          onError={(msg) => showToast("error", msg)}
          headers={headers}
        />
      )}
    </div>
  );
}

/* ══════════════════ Sub-components ══════════════════ */
function StatCard({ label, value, subLabel, color = "amber" }) {
  const cls = COLOR_CLASSES[color] || COLOR_CLASSES.amber;
  return (
    <div className={`rounded-xl border p-2.5 ${cls}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <p className="text-lg font-bold leading-tight">{value ?? 0}</p>
      <p className="text-[10px] font-medium opacity-80">{label}</p>
      {subLabel && <p className="text-[9px] opacity-60 mt-0.5">{subLabel}</p>}
    </div>
  );
}

function FilterPill({ active, label, icon: Icon, onClick, testId }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? 'bg-sky-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-sky-300'}`}
      data-testid={testId}>
      {Icon && <Icon className="w-3 h-3" />}{label}
    </button>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-sky-200" data-testid="empty-state">
      <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-3">
        <FileUp className="w-7 h-7 text-sky-500" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">No content here yet</h3>
      <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
        Upload brochures, price lists, photos, or videos — your AI will share them with customers on WhatsApp instantly.
      </p>
      <button onClick={onAdd}
        className="inline-flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm px-4 py-2 rounded-lg"
        data-testid="empty-add-btn">
        <Plus className="w-4 h-4" /> Add First Content
      </button>
    </div>
  );
}

function ContentCard({ item, onEdit, onDelete, onShare }) {
  const cfg = getTypeCfg(item.content_type);
  const TypeIcon = cfg.icon;
  const cls = COLOR_CLASSES[cfg.color] || COLOR_CLASSES.gray;
  const isImg = item.content_type === "image" && item.url;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-sky-200 hover:shadow-sm transition-all" data-testid={`content-${item.id}`}>
      {/* Preview strip */}
      {isImg ? (
        <div className="h-28 bg-gray-50 overflow-hidden flex items-center justify-center">
          <img src={item.url} alt={item.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      ) : (
        <div className={`h-20 flex items-center justify-center ${cls.split(' ')[0]}`}>
          <TypeIcon className={`w-10 h-10 ${cls.split(' ')[1]}`} />
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
            <p className="text-[10px] text-gray-400 font-medium uppercase">{cfg.label}</p>
          </div>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0">
            <Share2 className="w-2.5 h-2.5" />{item.share_count || 0}
          </span>
        </div>

        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{item.description}</p>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.slice(0, 4).map((t, i) => (
              <span key={i} className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t border-gray-50">
          <button onClick={onShare} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-green-50 text-green-600 text-xs font-medium" data-testid={`share-${item.id}`}>
            <Share2 className="w-3 h-3" /> Share
          </button>
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-blue-50 text-blue-600 text-xs font-medium" data-testid={`open-${item.id}`}>
              <Download className="w-3 h-3" /> Open
            </a>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" data-testid={`edit-${item.id}`}>
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" data-testid={`delete-${item.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ Add/Edit Modal (multi-step) ══════════════════ */
function AddContentModal({ editItem, onClose, onSaved, onError, headers }) {
  const isEdit = !!editItem;
  const [step, setStep] = useState(isEdit ? "details" : "type"); // type → details
  const [selectedType, setSelectedType] = useState(editItem?.content_type || null);
  const [form, setForm] = useState({
    title: editItem?.title || "",
    description: editItem?.description || "",
    url: editItem?.url || "",
    file_name: editItem?.file_name || "",
    file_size: editItem?.file_size || 0,
    mime_type: editItem?.mime_type || "",
    tags: (editItem?.tags || []).join(", "),
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const cfg = selectedType ? getTypeCfg(selectedType) : null;
  const needsFile = cfg && !!cfg.accept;

  const handlePickType = (key) => {
    setSelectedType(key);
    setStep("details");
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("context", "general");
      fd.append("description", "content_library");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API}/files/upload`);
      xhr.setRequestHeader("Authorization", headers.Authorization);
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setForm(f => ({
              ...f,
              url: data.file_url || data.url || "",
              file_name: data.filename || file.name,
              file_size: file.size,
              mime_type: file.type,
              title: f.title || file.name.replace(/\.[^/.]+$/, ""),
            }));
          } catch (e) { onError?.("Upload parse failed"); }
        } else {
          onError?.("Upload failed (" + xhr.status + ")");
        }
      };
      xhr.onerror = () => { setUploading(false); onError?.("Upload network error"); };
      xhr.send(fd);
    } catch (e) {
      setUploading(false);
      onError?.(e.message || "Upload failed");
    }
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!form.title.trim() || !selectedType) return;
    if (needsFile && !form.url && !isEdit) {
      onError?.("Please upload a file first");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      content_type: selectedType,
      description: form.description,
      url: form.url,
      file_name: form.file_name,
      file_size: form.file_size,
      mime_type: form.mime_type,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    };
    try {
      const url = isEdit ? `${API}/memoraai/content/${editItem.id}` : `${API}/memoraai/content`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) onSaved();
      else onError?.("Save failed");
    } catch (err) { onError?.("Save error"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose} data-testid="add-content-modal">
      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[94vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            {step === "details" && cfg && <cfg.icon className="w-5 h-5 text-sky-600" />}
            {step === "type" ? "What are you adding?" : (isEdit ? "Edit Content" : `Add ${cfg?.label || "Content"}`)}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700" data-testid="close-add-modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "type" && (
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">Pick a type — then upload the file or enter details.</p>
            <div className="grid grid-cols-2 gap-2" data-testid="type-picker">
              {CONTENT_TYPES.map(t => {
                const cls = COLOR_CLASSES[t.color] || COLOR_CLASSES.gray;
                return (
                  <button key={t.key} onClick={() => handlePickType(t.key)}
                    className={`border-2 rounded-xl p-3 text-left hover:shadow-sm transition-all hover:border-sky-300 ${cls.split(' ')[2]}`}
                    data-testid={`pick-type-${t.key}`}>
                    <div className={`w-9 h-9 rounded-lg ${cls.split(' ')[0]} flex items-center justify-center mb-2`}>
                      <t.icon className={`w-5 h-5 ${cls.split(' ')[1]}`} />
                    </div>
                    <p className="font-semibold text-sm text-gray-900">{t.label}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "details" && cfg && (
          <form onSubmit={save} className="p-4 space-y-3">
            {/* File upload zone for file-based types */}
            {needsFile && (
              <div>
                <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Upload file *</span>
                {form.url && form.file_name ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2" data-testid="file-uploaded">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{form.file_name}</p>
                      <p className="text-[10px] text-gray-500">{formatBytes(form.file_size)}</p>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, url: "", file_name: "", file_size: 0, mime_type: "" }))}
                      className="text-red-500 p-1 hover:bg-red-50 rounded" data-testid="remove-file-btn">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input type="file" ref={fileRef} accept={cfg.accept}
                      onChange={e => handleFile(e.target.files?.[0])}
                      className="hidden" data-testid="file-input" />
                    <button type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed border-sky-300 bg-sky-50/50 rounded-xl py-8 px-4 flex flex-col items-center justify-center gap-2 hover:border-sky-400 hover:bg-sky-50 transition-colors disabled:opacity-60"
                      data-testid="upload-dropzone">
                      {uploading ? (
                        <>
                          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                          <p className="text-sm font-medium text-sky-700">Uploading… {uploadProgress}%</p>
                          <div className="w-full bg-sky-100 rounded-full h-1.5 mt-1">
                            <div className="bg-sky-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-sky-500" />
                          <p className="text-sm font-semibold text-gray-800">Tap to pick file</p>
                          <p className="text-[10px] text-gray-500">Accepts: {cfg.accept}</p>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* URL input for link types */}
            {!needsFile && (selectedType === "link" || selectedType === "template" || selectedType === "faq" || selectedType === "note") && (
              <Field label={
                selectedType === "link" ? "URL *"
                : selectedType === "faq" ? "Answer text *"
                : selectedType === "note" ? "Long note content *"
                : "Template text *"
              }>
                {selectedType === "faq" || selectedType === "template" || selectedType === "note" ? (
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={selectedType === "note" ? 10 : 5}
                    required
                    placeholder={
                      selectedType === "faq" ? "Write the answer the AI should use…" :
                      selectedType === "note" ? "Write long-form notes, SOPs, conversation scripts, product descriptions… (no length limit)" :
                      "Message template with placeholders, e.g. Hi {name}, your order is ready."
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-vertical font-mono"
                    style={{ minHeight: selectedType === "note" ? '220px' : '100px' }}
                    data-testid="input-long-text"
                  />
                ) : (
                  <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://…" required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="input-url" />
                )}
                {(selectedType === "note" || selectedType === "faq" || selectedType === "template") && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-gray-400">
                      {(form.description || "").length} characters · drag corner to resize
                    </p>
                  </div>
                )}
              </Field>
            )}

            <Field label="Title *">
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="E.g., October Price List"
                required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="input-title" />
            </Field>

            {!(selectedType === "faq" || selectedType === "template" || selectedType === "note") && (
              <Field label="Description / Long notes (optional)">
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={5}
                  placeholder="Add long-form notes, details, or instructions here. No length limit."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-vertical"
                  style={{ minHeight: '100px' }}
                  data-testid="input-description"
                />
                <p className="text-[10px] text-gray-400 mt-1">{(form.description || "").length} characters · drag corner to resize</p>
              </Field>
            )}

            <Field label="Tags (comma separated)">
              <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="october, premium, 2bhk"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="input-tags" />
            </Field>

            <p className="text-[10px] text-gray-400 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Tagged content helps the AI pick the right brochure/image when customers ask.
            </p>

            <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white border-t border-gray-100 flex gap-2 mt-3">
              {!isEdit && (
                <button type="button" onClick={() => setStep("type")} className="text-sm text-gray-500 hover:text-gray-700 px-3" data-testid="back-type-btn">
                  ← Change type
                </button>
              )}
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100" data-testid="cancel-add-btn">
                Cancel
              </button>
              <button type="submit" disabled={saving || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 bg-sky-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-sky-600 disabled:opacity-50" data-testid="save-content-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEdit ? "Save Changes" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
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

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}
