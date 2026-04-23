import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Plus, FileText, Send, CheckCircle, XCircle,
  Edit2, Trash2, Sparkles, Clock, Eye
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-700",
  pending_review: "bg-blue-100 text-blue-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_ICONS = {
  draft: Edit2, pending_review: Clock, submitted: Send,
  approved: CheckCircle, rejected: XCircle,
};

export default function TemplateWorkflow() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    name: "", category: "MARKETING", body_text: "", header_text: "", footer_text: "", language: "en"
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTemplates = useCallback(async () => {
    try {
      const params = filter ? `?status=${filter}` : "";
      const res = await axios.get(`${API}/memoraai/templates${params}`, { headers });
      setTemplates(res.data.templates || []);
    } catch (e) { console.error(e); }
  }, [filter, token]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const autoGenerate = async () => {
    try {
      await axios.post(`${API}/memoraai/templates/auto-generate`, {}, { headers });
      await fetchTemplates();
    } catch (e) { console.error(e); }
  };

  const saveTemplate = async () => {
    if (!form.name || !form.body_text) return;
    try {
      if (editId) {
        await axios.put(`${API}/memoraai/templates/${editId}`, form, { headers });
      } else {
        await axios.post(`${API}/memoraai/templates`, form, { headers });
      }
      resetForm();
      await fetchTemplates();
    } catch (e) { console.error(e); }
  };

  const submitTemplate = async (id) => {
    try {
      const res = await axios.post(`${API}/memoraai/templates/${id}/submit`, {}, { headers });
      alert(res.data.message);
      await fetchTemplates();
    } catch (e) { alert(e.response?.data?.detail || "Submission failed"); }
  };

  const approveTemplate = async (id) => {
    try {
      await axios.post(`${API}/memoraai/templates/${id}/approve`, {}, { headers });
      await fetchTemplates();
    } catch (e) { console.error(e); }
  };

  const rejectTemplate = async (id) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try {
      await axios.post(`${API}/memoraai/templates/${id}/reject`, { reason }, { headers });
      await fetchTemplates();
    } catch (e) { console.error(e); }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await axios.delete(`${API}/memoraai/templates/${id}`, { headers });
      await fetchTemplates();
    } catch (e) { console.error(e); }
  };

  const startEdit = (tpl) => {
    setForm({
      name: tpl.name, category: tpl.category, body_text: tpl.body_text,
      header_text: tpl.header_text || "", footer_text: tpl.footer_text || "", language: tpl.language
    });
    setEditId(tpl.id);
    setShowAdd(true);
  };

  const resetForm = () => {
    setForm({ name: "", category: "MARKETING", body_text: "", header_text: "", footer_text: "", language: "en" });
    setEditId(null);
    setShowAdd(false);
  };

  const statusCounts = {};
  templates.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

  return (
    <div className="min-h-screen bg-gray-50" data-testid="template-workflow-page">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Template Workflow</h1>
            <p className="text-sm text-gray-500">Create, review, and submit WhatsApp message templates</p>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6" data-testid="status-summary">
          {["draft", "pending_review", "submitted", "approved", "rejected"].map(s => (
            <Card key={s} className={`cursor-pointer ${filter === s ? "ring-2 ring-purple-500" : ""}`}
              onClick={() => setFilter(f => f === s ? "" : s)}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold">{statusCounts[s] || 0}</div>
                <div className="text-xs text-gray-500 capitalize">{s.replace("_", " ")}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="gap-1" data-testid="create-template-btn">
            <Plus className="w-4 h-4" /> Create Template
          </Button>
          <Button variant="outline" onClick={autoGenerate} className="gap-1" data-testid="auto-generate-btn">
            <Sparkles className="w-4 h-4" /> Auto-Generate Templates
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showAdd && (
          <Card className="mb-4 border-purple-200 bg-purple-50/20" data-testid="template-form">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">{editId ? "Edit Template" : "New Template"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Template Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="tpl-name" />
                <select className="border rounded-md px-3 py-2 text-sm bg-white" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))} data-testid="tpl-category">
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
                <select className="border rounded-md px-3 py-2 text-sm bg-white" value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))} data-testid="tpl-language">
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                </select>
                <Input placeholder="Header Text (optional)" value={form.header_text} onChange={e => setForm(f => ({ ...f, header_text: e.target.value }))} data-testid="tpl-header" />
                <div className="md:col-span-2">
                  <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]" placeholder="Message Body * (use {{1}}, {{2}} for variables)"
                    value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} data-testid="tpl-body" />
                </div>
                <Input placeholder="Footer Text (optional)" value={form.footer_text} onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))} data-testid="tpl-footer" />
              </div>
              <div className="flex gap-2 mt-3">
                <Button onClick={saveTemplate} data-testid="save-template">{editId ? "Update" : "Save as Draft"}</Button>
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Templates List */}
        <div className="space-y-2">
          {templates.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No templates yet. Create one or auto-generate from your business category.
            </CardContent></Card>
          ) : templates.map(tpl => {
            const StatusIcon = STATUS_ICONS[tpl.status] || FileText;
            return (
              <Card key={tpl.id} data-testid={`template-${tpl.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{tpl.name}</span>
                        <Badge className={`${STATUS_STYLES[tpl.status]} text-xs`}>{tpl.status.replace("_", " ")}</Badge>
                        <Badge variant="outline" className="text-xs">{tpl.category}</Badge>
                        <Badge variant="outline" className="text-xs">{tpl.language}</Badge>
                      </div>
                      {tpl.header_text && <p className="text-xs text-gray-500 font-medium">{tpl.header_text}</p>}
                      <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">{tpl.body_text}</p>
                      {tpl.footer_text && <p className="text-xs text-gray-400 mt-1">{tpl.footer_text}</p>}
                      {tpl.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1 bg-red-50 p-1 rounded">Rejected: {tpl.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 ml-3">
                      {(tpl.status === "draft" || tpl.status === "rejected") && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(tpl)} data-testid={`edit-${tpl.id}`}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" className="gap-1" onClick={() => submitTemplate(tpl.id)} data-testid={`submit-${tpl.id}`}>
                            <Send className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {tpl.status === "pending_review" && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => approveTemplate(tpl.id)} data-testid={`approve-${tpl.id}`}>
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500" onClick={() => rejectTemplate(tpl.id)} data-testid={`reject-${tpl.id}`}>
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => deleteTemplate(tpl.id)} data-testid={`delete-${tpl.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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
