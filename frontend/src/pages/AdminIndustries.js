import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Globe, Eye, GripVertical } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminIndustries() {
  const navigate = useNavigate();
  const [industries, setIndustries] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "", slug: "", icon: "building", hero_title: "", hero_sub: "",
    business_name: "", seo_title: "", seo_desc: "",
    benefits: "", services: "", demo_chat_text: ""
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchIndustries = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/memoraai/industries/public`);
      setIndustries(res.data.industries || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchIndustries(); }, [fetchIndustries]);

  const saveIndustry = async () => {
    const data = {
      ...form,
      benefits: form.benefits.split("\n").filter(Boolean),
      services: form.services.split("\n").filter(Boolean),
      demo_chat: parseChatText(form.demo_chat_text),
    };
    try {
      if (editId) {
        await axios.put(`${API}/memoraai/industries/${editId}`, data, { headers });
      } else {
        data.slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await axios.post(`${API}/memoraai/industries`, data, { headers });
      }
      resetForm();
      await fetchIndustries();
    } catch (e) { console.error(e); }
  };

  const deleteIndustry = async (id) => {
    if (!window.confirm("Delete this industry?")) return;
    try {
      await axios.delete(`${API}/memoraai/industries/${id}`, { headers });
      await fetchIndustries();
    } catch (e) { console.error(e); }
  };

  const startEdit = (ind) => {
    setForm({
      title: ind.title, slug: ind.slug, icon: ind.icon || "building",
      hero_title: ind.hero_title || "", hero_sub: ind.hero_sub || "",
      business_name: ind.business_name || "",
      seo_title: ind.seo_title || "", seo_desc: ind.seo_desc || "",
      benefits: (ind.benefits || []).join("\n"),
      services: (ind.services || []).join("\n"),
      demo_chat_text: (ind.demo_chat || []).map(m => `${m.from}: ${m.text}`).join("\n"),
    });
    setEditId(ind.id);
    setShowAdd(true);
  };

  const resetForm = () => {
    setForm({ title: "", slug: "", icon: "building", hero_title: "", hero_sub: "", business_name: "", seo_title: "", seo_desc: "", benefits: "", services: "", demo_chat_text: "" });
    setEditId(null);
    setShowAdd(false);
  };

  function parseChatText(text) {
    return text.split("\n").filter(Boolean).map(line => {
      if (line.startsWith("customer:") || line.startsWith("Customer:")) return { from: "customer", text: line.replace(/^customer:\s*/i, "") };
      if (line.startsWith("bot:") || line.startsWith("Bot:")) return { from: "bot", text: line.replace(/^bot:\s*/i, "") };
      return { from: "bot", text: line };
    });
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-industries-page">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Button>
          <div className="flex-1"><h1 className="text-2xl font-bold text-gray-900">Industry Pages Manager</h1><p className="text-sm text-gray-500">Add, edit, and manage industry landing pages</p></div>
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="gap-1" data-testid="add-industry-btn"><Plus className="w-4 h-4" /> Add Industry</Button>
        </div>

        {showAdd && (
          <Card className="mb-6 border-violet-200" data-testid="industry-form">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-lg">{editId ? "Edit Industry" : "New Industry"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Industry Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="ind-title" />
                <Input placeholder="URL Slug (auto)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} data-testid="ind-slug" />
                <Input placeholder="Icon (building, star, stethoscope...)" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} data-testid="ind-icon" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Hero Title *" value={form.hero_title} onChange={e => setForm(f => ({ ...f, hero_title: e.target.value }))} data-testid="ind-hero-title" />
                <Input placeholder="Business Name (for demo)" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} data-testid="ind-biz-name" />
              </div>
              <textarea className="w-full border rounded-lg p-3 text-sm min-h-[60px]" placeholder="Hero Subtitle / Description" value={form.hero_sub} onChange={e => setForm(f => ({ ...f, hero_sub: e.target.value }))} data-testid="ind-hero-sub" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Services (one per line)</label>
                  <textarea className="w-full border rounded-lg p-3 text-sm min-h-[80px]" value={form.services} onChange={e => setForm(f => ({ ...f, services: e.target.value }))} placeholder="Plot Sales&#10;Flat Booking&#10;Site Visits" data-testid="ind-services" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Benefits (one per line)</label>
                  <textarea className="w-full border rounded-lg p-3 text-sm min-h-[80px]" value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))} placeholder="Remembers customer budget&#10;Auto follow-up" data-testid="ind-benefits" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Demo Chat (format: customer: text or bot: text, one per line)</label>
                <textarea className="w-full border rounded-lg p-3 text-sm min-h-[120px] font-mono" value={form.demo_chat_text} onChange={e => setForm(f => ({ ...f, demo_chat_text: e.target.value }))} placeholder="customer: Hi, I asked about plots last week.&#10;bot: Welcome back! You were looking for..." data-testid="ind-demo-chat" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="SEO Meta Title" value={form.seo_title} onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))} data-testid="ind-seo-title" />
                <Input placeholder="SEO Meta Description" value={form.seo_desc} onChange={e => setForm(f => ({ ...f, seo_desc: e.target.value }))} data-testid="ind-seo-desc" />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveIndustry} className="gap-1" data-testid="save-industry"><Save className="w-4 h-4" /> {editId ? "Update" : "Create"}</Button>
                <Button variant="ghost" onClick={resetForm}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {industries.map((ind, i) => (
            <Card key={ind.id || i} data-testid={`industry-row-${ind.slug}`}>
              <CardContent className="p-3 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0"><Globe className="w-5 h-5 text-violet-600" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900">{ind.title}</span>
                    <Badge variant="outline" className="text-[10px]">/{ind.slug}</Badge>
                  </div>
                  {ind.services && <div className="flex flex-wrap gap-1">{ind.services.slice(0, 4).map((s, j) => <span key={j} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{s}</span>)}</div>}
                  <p className="text-xs text-gray-400 truncate mt-0.5">{ind.hero_title}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => window.open(`/industry/${ind.slug}`, '_blank')} data-testid={`preview-${ind.slug}`}><Eye className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(ind)} data-testid={`edit-${ind.slug}`}><Edit2 className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteIndustry(ind.id)} data-testid={`delete-${ind.slug}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
