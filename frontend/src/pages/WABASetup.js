import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MessageSquare, Shield, Phone, Link2, CheckCircle,
  AlertCircle, RefreshCw, FileText, Settings
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WABASetup() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form, setForm] = useState({
    phone_number: "", phone_number_id: "", waba_id: "", access_token: "",
    business_name: "", business_description: "", business_address: "",
    business_website: "", greeting_message: "", ai_persona: ""
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/memoraai/waba/config`, { headers });
      if (res.data.config) {
        setConfig(res.data.config);
        setForm(prev => ({
          ...prev,
          phone_number: res.data.config.phone_number || "",
          phone_number_id: res.data.config.phone_number_id || "",
          waba_id: res.data.config.waba_id || "",
          business_name: res.data.config.business_name || "",
          business_description: res.data.config.business_description || "",
          business_address: res.data.config.business_address || "",
          business_website: res.data.config.business_website || "",
          greeting_message: res.data.config.greeting_message || "",
          ai_persona: res.data.config.ai_persona || "",
        }));
      }
    } catch (e) {
      console.error("Failed to fetch WABA config", e);
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = async () => {
    setLoading(true);
    try {
      const data = {};
      Object.entries(form).forEach(([k, v]) => { if (v) data[k] = v; });
      await axios.post(`${API}/memoraai/waba/config`, data, { headers });
      await fetchConfig();
    } catch (e) {
      console.error("Failed to save config", e);
    }
    setLoading(false);
  };

  const verifyConnection = async () => {
    setVerifying(true);
    try {
      const res = await axios.post(`${API}/memoraai/waba/verify`, {}, { headers });
      if (res.data.verified) {
        alert("WABA connection verified successfully!");
        await fetchConfig();
      } else {
        alert(`Verification failed: ${res.data.error || "Unknown error"}`);
      }
    } catch (e) {
      alert("Verification failed: " + (e.response?.data?.detail || e.message));
    }
    setVerifying(false);
  };

  const generateTemplates = async () => {
    try {
      const res = await axios.post(`${API}/memoraai/waba/generate-templates`, {}, { headers });
      setTemplates(res.data.templates || []);
    } catch (e) {
      console.error("Failed to generate templates", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="waba-setup-page">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-green-600" /> WhatsApp Business Setup
            </h1>
            <p className="text-sm text-gray-500">Self-service WABA configuration for your business</p>
          </div>
        </div>

        {/* Status Badge */}
        {config && (
          <div className="mb-4 flex gap-2">
            <Badge className={config.is_verified ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
              {config.is_verified ? <><CheckCircle className="w-3 h-3 mr-1" /> Verified</> : <><AlertCircle className="w-3 h-3 mr-1" /> Not Verified</>}
            </Badge>
            {config.is_active && <Badge className="bg-blue-100 text-blue-700">Active</Badge>}
          </div>
        )}

        {/* Business Details */}
        <Card className="mb-4" data-testid="business-details-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5" /> Business Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Business Name</label>
                <Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="Your Business Name" data-testid="waba-business-name" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Business Website</label>
                <Input value={form.business_website} onChange={e => setForm({ ...form, business_website: e.target.value })} placeholder="https://yourbusiness.com" data-testid="waba-business-website" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Business Description</label>
                <Input value={form.business_description} onChange={e => setForm({ ...form, business_description: e.target.value })} placeholder="What does your business do?" data-testid="waba-business-desc" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Business Address</label>
                <Input value={form.business_address} onChange={e => setForm({ ...form, business_address: e.target.value })} placeholder="Full business address" data-testid="waba-business-address" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WABA Credentials */}
        <Card className="mb-4" data-testid="waba-credentials-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> WABA Credentials</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">WhatsApp Phone Number</label>
                <Input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} placeholder="+91 XXXXX XXXXX" data-testid="waba-phone" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Phone Number ID</label>
                <Input value={form.phone_number_id} onChange={e => setForm({ ...form, phone_number_id: e.target.value })} placeholder="Meta Phone Number ID" data-testid="waba-phone-id" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">WABA ID</label>
                <Input value={form.waba_id} onChange={e => setForm({ ...form, waba_id: e.target.value })} placeholder="WhatsApp Business Account ID" data-testid="waba-id" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Access Token</label>
                <Input type="password" value={form.access_token} onChange={e => setForm({ ...form, access_token: e.target.value })}
                  placeholder={config?.has_token ? "Token saved (enter new to update)" : "Meta permanent access token"}
                  data-testid="waba-token" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Personality */}
        <Card className="mb-4" data-testid="ai-personality-card">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5" /> AI Chat Settings</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Greeting Message</label>
                <Input value={form.greeting_message} onChange={e => setForm({ ...form, greeting_message: e.target.value })}
                  placeholder="e.g., Welcome to ABC Clinic! How can we help you today?" data-testid="waba-greeting" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">AI Persona (how the AI should behave)</label>
                <Input value={form.ai_persona} onChange={e => setForm({ ...form, ai_persona: e.target.value })}
                  placeholder="e.g., Friendly astrology expert who speaks Telugu and English" data-testid="waba-persona" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={saveConfig} disabled={loading} className="gap-2" data-testid="save-waba-config">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Configuration
          </Button>
          <Button variant="outline" onClick={verifyConnection} disabled={verifying} className="gap-2" data-testid="verify-waba">
            {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Verify Connection
          </Button>
          <Button variant="outline" onClick={generateTemplates} className="gap-2" data-testid="generate-templates">
            <FileText className="w-4 h-4" /> Auto-Generate Templates
          </Button>
        </div>

        {/* Generated Templates */}
        {templates.length > 0 && (
          <Card data-testid="generated-templates">
            <CardHeader><CardTitle className="text-lg">Generated Templates</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map((t, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border" data-testid={`template-${i}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{t.category}</Badge>
                      <span className="font-medium text-sm">{t.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{t.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.description}</p>
                  </div>
                ))}
                <p className="text-xs text-gray-500 mt-2">
                  Submit these templates to Meta for approval via the Meta Business Manager.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
