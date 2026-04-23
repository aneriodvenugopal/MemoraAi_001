import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, X, BookOpen, Shield, MessageSquare, Clock, AlertTriangle, Globe, Calendar, Lock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ICONS = {
  greeting: MessageSquare, language: Globe, pricing: Lock, followup: Clock,
  escalation: AlertTriangle, booking: Calendar, closing: Clock, sensitive: Shield, custom: BookOpen,
};

export default function BusinessRules() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", category: "custom", rule: "" });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchRules = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/memoraai/rules`, { headers });
      setRules(res.data.rules || []);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const saveRule = async () => {
    if (!form.title || !form.rule) return;
    try {
      await axios.post(`${API}/memoraai/rules`, form, { headers });
      setForm({ title: "", category: "custom", rule: "" });
      setShowAdd(false);
      await fetchRules();
    } catch (e) { console.error(e); }
  };

  const toggleRule = async (id) => {
    try {
      await axios.post(`${API}/memoraai/rules/${id}/toggle`, {}, { headers });
      await fetchRules();
    } catch (e) { console.error(e); }
  };

  const deleteRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await axios.delete(`${API}/memoraai/rules/${id}`, { headers });
      await fetchRules();
    } catch (e) { console.error(e); }
  };

  const activeCount = rules.filter(r => r.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="business-rules-page">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Business Rules</h1>
            <p className="text-sm text-gray-500">Define how MemoraAI should behave for your business</p>
          </div>
          <Badge className="bg-green-100 text-green-700">{activeCount} Active</Badge>
        </div>

        <div className="bg-sky-50 rounded-xl p-4 border border-sky-200 mb-6" data-testid="rules-info">
          <h3 className="font-semibold text-sky-800 text-sm mb-1">How Rules Work</h3>
          <p className="text-xs text-sky-700">Active rules are injected into every AI conversation. The AI will follow these rules when responding to customers on WhatsApp. You can add, edit, enable/disable rules anytime.</p>
        </div>

        <Button onClick={() => setShowAdd(true)} className="mb-4 gap-1" data-testid="add-rule-btn">
          <Plus className="w-4 h-4" /> Add New Rule
        </Button>

        {showAdd && (
          <Card className="mb-4 border-violet-200" data-testid="rule-form">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">New Rule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Rule Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="rule-title" />
                <select className="border rounded-md px-3 py-2 text-sm bg-white" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} data-testid="rule-category">
                  <option value="greeting">Greeting</option>
                  <option value="language">Language</option>
                  <option value="pricing">Pricing</option>
                  <option value="followup">Follow-up</option>
                  <option value="escalation">Escalation</option>
                  <option value="booking">Booking</option>
                  <option value="closing">Closing Hours</option>
                  <option value="sensitive">Sensitive Topics</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <textarea className="w-full border rounded-lg p-3 text-sm min-h-[80px]" placeholder="Rule description — what should the AI do or not do? *"
                value={form.rule} onChange={e => setForm(f => ({ ...f, rule: e.target.value }))} data-testid="rule-text" />
              <div className="flex gap-2">
                <Button onClick={saveRule} className="gap-1" data-testid="save-rule"><Save className="w-4 h-4" /> Save Rule</Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {rules.map(rule => {
            const Icon = CATEGORY_ICONS[rule.category] || BookOpen;
            return (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''} data-testid={`rule-${rule.id}`}>
                <CardContent className="p-3 flex items-start gap-3">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule.id)} className="mt-1" data-testid={`toggle-${rule.id}`} />
                  <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-gray-900 text-sm">{rule.title}</span>
                      <Badge variant="outline" className="text-[9px]">{rule.category}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{rule.rule}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400 flex-shrink-0" onClick={() => deleteRule(rule.id)} data-testid={`delete-${rule.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
