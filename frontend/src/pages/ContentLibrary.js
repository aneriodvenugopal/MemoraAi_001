import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, FileText, Image, Video, Link2, HelpCircle, Tag,
  Trash2, Edit2, Share2, Search, BarChart3, X, Save
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_CONFIG = {
  brochure: { icon: FileText, color: "bg-blue-100 text-blue-600", label: "Brochure" },
  image: { icon: Image, color: "bg-green-100 text-green-600", label: "Image" },
  video: { icon: Video, color: "bg-red-100 text-red-600", label: "Video" },
  link: { icon: Link2, color: "bg-purple-100 text-purple-600", label: "Link" },
  faq: { icon: HelpCircle, color: "bg-amber-100 text-amber-600", label: "FAQ" },
  price_list: { icon: Tag, color: "bg-emerald-100 text-emerald-600", label: "Price List" },
  document: { icon: FileText, color: "bg-gray-100 text-gray-600", label: "Document" },
  template: { icon: FileText, color: "bg-indigo-100 text-indigo-600", label: "Template" },
};

export default function ContentLibrary() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    title: "", content_type: "document", description: "", url: "",
    file_name: "", tags: ""
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const params = filter ? `?content_type=${filter}` : "";
      const [itemsRes, statsRes] = await Promise.all([
        axios.get(`${API}/memoraai/content${params}`, { headers }),
        axios.get(`${API}/memoraai/content/stats`, { headers }),
      ]);
      setItems(itemsRes.data.items || []);
      setStats(statsRes.data);
    } catch (e) { console.error(e); }
  }, [filter, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveItem = async () => {
    if (!form.title) return;
    const data = { ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) };
    try {
      if (editId) {
        await axios.put(`${API}/memoraai/content/${editId}`, data, { headers });
      } else {
        await axios.post(`${API}/memoraai/content`, data, { headers });
      }
      resetForm();
      await fetchData();
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this content?")) return;
    try {
      await axios.delete(`${API}/memoraai/content/${id}`, { headers });
      await fetchData();
    } catch (e) { console.error(e); }
  };

  const shareItem = async (id) => {
    try {
      await axios.post(`${API}/memoraai/content/${id}/share`, {}, { headers });
      await fetchData();
    } catch (e) { console.error(e); }
  };

  const startEdit = (item) => {
    setForm({
      title: item.title, content_type: item.content_type, description: item.description || "",
      url: item.url || "", file_name: item.file_name || "",
      tags: (item.tags || []).join(", "),
    });
    setEditId(item.id);
    setShowAdd(true);
  };

  const resetForm = () => {
    setForm({ title: "", content_type: "document", description: "", url: "", file_name: "", tags: "" });
    setEditId(null);
    setShowAdd(false);
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="content-library-page">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Button>
          <div className="flex-1"><h1 className="text-2xl font-bold text-gray-900">Content Library</h1><p className="text-sm text-gray-500">Manage brochures, images, videos, and files for WhatsApp sharing</p></div>
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="gap-1" data-testid="add-content-btn"><Plus className="w-4 h-4" /> Add Content</Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="content-stats">
            <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold text-violet-600">{stats.total}</div><div className="text-xs text-gray-500">Total Items</div></CardContent></Card>
            {Object.entries(stats.by_type || {}).slice(0, 3).map(([type, data]) => (
              <Card key={type}><CardContent className="p-3 text-center"><div className="text-xl font-bold text-gray-700">{data.count}</div><div className="text-xs text-gray-500">{TYPE_CONFIG[type]?.label || type} ({data.shares} shares)</div></CardContent></Card>
            ))}
          </div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap gap-1 mb-4">
          <Button size="sm" variant={!filter ? "default" : "outline"} onClick={() => setFilter("")}>All</Button>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(f => f === key ? "" : key)} className="gap-1" data-testid={`filter-${key}`}>
              <cfg.icon className="w-3 h-3" /> {cfg.label}
            </Button>
          ))}
        </div>

        {/* Add/Edit Form */}
        {showAdd && (
          <Card className="mb-4 border-violet-200" data-testid="content-form">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">{editId ? "Edit Content" : "Add New Content"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="content-title" />
                <select className="border rounded-md px-3 py-2 text-sm bg-white" value={form.content_type} onChange={e => setForm(f => ({ ...f, content_type: e.target.value }))} data-testid="content-type">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <Input placeholder="URL / File Link" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} data-testid="content-url" />
              </div>
              <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="content-desc" />
              <Input placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} data-testid="content-tags" />
              <div className="flex gap-2">
                <Button onClick={saveItem} className="gap-1" data-testid="save-content"><Save className="w-4 h-4" /> {editId ? "Update" : "Save"}</Button>
                <Button variant="ghost" onClick={resetForm}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content List */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-gray-500"><FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>No content yet. Add brochures, images, and videos for WhatsApp sharing.</p></CardContent></Card>
          ) : items.map(item => {
            const cfg = TYPE_CONFIG[item.content_type] || TYPE_CONFIG.document;
            const TypeIcon = cfg.icon;
            return (
              <Card key={item.id} data-testid={`content-${item.id}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}><TypeIcon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium text-gray-900 text-sm">{item.title}</span><Badge variant="outline" className="text-[10px]">{cfg.label}</Badge></div>
                    {item.description && <p className="text-xs text-gray-400 truncate">{item.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {(item.tags || []).map((t, i) => <span key={i} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>)}
                      <span className="text-[10px] text-gray-400 flex items-center gap-1"><Share2 className="w-3 h-3" />{item.share_count || 0} shares</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="text-green-600" onClick={() => shareItem(item.id)} data-testid={`share-${item.id}`}><Share2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(item)} data-testid={`edit-${item.id}`}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteItem(item.id)} data-testid={`delete-${item.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
