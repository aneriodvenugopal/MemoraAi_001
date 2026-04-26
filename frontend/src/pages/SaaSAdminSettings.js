import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Settings, Save, Loader2, ShieldCheck, MessageSquare, KeyRound, Brain, Globe,
  CheckCircle2, XCircle, AlertCircle, IndianRupee, Copy, Image as ImageIcon, Upload, RefreshCw
} from "lucide-react";
import SaaSAdminLayout from "../layouts/SaaSAdminLayout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SaaSAdminSettings() {
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setSettings(d.settings || {});
        setIntegrations(d.integrations || {});
      }
    } catch { /* noop */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch) => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/settings`, {
        method: "PUT", headers, body: JSON.stringify(patch),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Save failed");
      setSettings(d.settings || settings);
      showFlash("success", "Settings saved");
    } catch (e) { showFlash("error", e.message || String(e)); }
    setSaving(false);
  };

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));
  const setPlan = (plan, price) => setSettings(s => ({
    ...s,
    plan_prices: { ...(s.plan_prices || {}), [plan]: Number(price) || 0 },
  }));

  if (loading || !settings) {
    return (
      <SaaSAdminLayout pageTitle="Platform Settings">
        <div className="py-20 text-center"><Loader2 className="w-7 h-7 text-sky-500 animate-spin mx-auto" /></div>
      </SaaSAdminLayout>
    );
  }

  return (
    <SaaSAdminLayout
      pageTitle="Platform Settings"
      pageSubtitle="Branding, pricing, webhooks, and integration health."
    >
      <div className="space-y-4 max-w-4xl">
        {flash && (
          <div className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${flash.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`} data-testid="settings-flash">
            {flash.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {flash.msg}
          </div>
        )}

        {/* Branding — Logo */}
        <LogoUploader token={token} onFlash={showFlash} />

        {/* Branding */}
        <Card title="Platform Branding" icon={Globe}>
          <Row label="Platform Name">
            <input value={settings.platform_name || ""} onChange={e => set("platform_name", e.target.value)} className="inp" data-testid="s-platform-name" />
          </Row>
          <Row label="Marketing Tagline">
            <input value={settings.marketing_tagline || ""} onChange={e => set("marketing_tagline", e.target.value)} className="inp" data-testid="s-tagline" />
          </Row>
          <Row label="Support WhatsApp">
            <input value={settings.support_whatsapp || ""} onChange={e => set("support_whatsapp", e.target.value)} placeholder="+916309356590" className="inp" data-testid="s-support-whatsapp" />
          </Row>
          <Row label="Support Email">
            <input type="email" value={settings.support_email || ""} onChange={e => set("support_email", e.target.value)} className="inp" data-testid="s-support-email" />
          </Row>
          <SaveBtn onClick={() => save({
            platform_name: settings.platform_name,
            marketing_tagline: settings.marketing_tagline,
            support_whatsapp: settings.support_whatsapp,
            support_email: settings.support_email,
          })} saving={saving} testid="save-branding" />
        </Card>

        {/* Pricing */}
        <Card title="Plan Pricing (Monthly)" icon={IndianRupee}>
          <p className="text-[11px] text-gray-500 mb-2">Used for MRR estimation on the Analytics page.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["trial", "starter", "business", "premium"].map(p => (
              <Row key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} compact>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Rs.</span>
                  <input type="number" value={settings.plan_prices?.[p] ?? 0} onChange={e => setPlan(p, e.target.value)} className="inp" data-testid={`s-price-${p}`} />
                </div>
              </Row>
            ))}
          </div>
          <Row label="Default Trial (days)">
            <input type="number" value={settings.default_trial_days || 14} onChange={e => set("default_trial_days", Number(e.target.value) || 14)} className="inp w-32" data-testid="s-trial-days" />
          </Row>
          <SaveBtn onClick={() => save({ plan_prices: settings.plan_prices, default_trial_days: settings.default_trial_days })} saving={saving} testid="save-pricing" />
        </Card>

        {/* Policies */}
        <Card title="Platform Policies" icon={ShieldCheck}>
          <Toggle label="Public signups open" description="Allow new businesses to register from the website" checked={!!settings.signups_open} onChange={v => { set("signups_open", v); save({ signups_open: v }); }} testid="s-signups-open" />
          <Toggle label="Require OTP for 'Login as'" description="Extra security when super_admin impersonates a tenant" checked={!!settings.impersonate_require_otp} onChange={v => { set("impersonate_require_otp", v); save({ impersonate_require_otp: v }); }} testid="s-impersonate-otp" />
        </Card>

        {/* AI */}
        <Card title="AI Defaults" icon={Brain}>
          <Row label="Default AI Model">
            <select value={settings.ai_default_model || "gpt-4o-mini"} onChange={e => set("ai_default_model", e.target.value)} className="inp" data-testid="s-ai-model">
              <option value="gpt-4o-mini">GPT-4o mini (balanced)</option>
              <option value="gpt-4o">GPT-4o (premium)</option>
              <option value="claude-sonnet-4">Claude Sonnet 4.5</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
          </Row>
          <Row label="SMS Provider">
            <select value={settings.sms_provider || "sms_login"} onChange={e => set("sms_provider", e.target.value)} className="inp" data-testid="s-sms-provider">
              <option value="sms_login">SMS Login (Eloniot sender)</option>
              <option value="msg91">MSG91</option>
              <option value="disabled">Disabled (OTP in server logs only)</option>
            </select>
          </Row>
          <SaveBtn onClick={() => save({ ai_default_model: settings.ai_default_model, sms_provider: settings.sms_provider })} saving={saving} testid="save-ai" />
        </Card>

        {/* Webhook */}
        <Card title="WhatsApp Webhook" icon={MessageSquare}>
          <p className="text-[11px] text-gray-500 mb-2">Configure these values in Meta Developer → WhatsApp → Configuration.</p>
          <Row label="Callback URL">
            <div className="flex items-center gap-1">
              <input value={settings.webhook_callback_url || ""} onChange={e => set("webhook_callback_url", e.target.value)} className="inp font-mono text-[11px]" data-testid="s-webhook-url" />
              <CopyBtn text={settings.webhook_callback_url} />
            </div>
          </Row>
          <Row label="Verify Token">
            <div className="flex items-center gap-1">
              <input value={settings.webhook_verify_token || ""} onChange={e => set("webhook_verify_token", e.target.value)} className="inp font-mono text-[11px]" data-testid="s-webhook-token" />
              <CopyBtn text={settings.webhook_verify_token} />
            </div>
          </Row>
          <SaveBtn onClick={() => save({ webhook_callback_url: settings.webhook_callback_url, webhook_verify_token: settings.webhook_verify_token })} saving={saving} testid="save-webhook" />
        </Card>

        {/* Integration health */}
        <Card title="Integration Health" icon={KeyRound}>
          <p className="text-[11px] text-gray-500 mb-3">Keys are read from backend environment variables. Update <code className="bg-gray-100 px-1 rounded">/app/backend/.env</code> and restart backend.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="integration-health">
            <IntTile label="Meta WhatsApp" status={integrations.meta_whatsapp} extra={integrations.meta_whatsapp_mode} />
            <IntTile label="Emergent LLM" status={integrations.emergent_llm} />
            <IntTile label="OpenAI" status={integrations.openai} />
            <IntTile label="Gemini" status={integrations.gemini} />
            <IntTile label="Razorpay" status={integrations.razorpay} />
            <IntTile label="Stripe" status={integrations.stripe} />
            <IntTile label="PayU" status={integrations.payu} />
            <IntTile label="MSG91 SMS" status={integrations.msg91_sms} />
            <IntTile label="SMS Login" status={integrations.sms_login} />
            <IntTile label="Resend Email" status={integrations.resend_email} />
            <IntTile label="Firebase Push" status={integrations.firebase} />
            <IntTile label="HeyGen" status={integrations.heygen} />
            <IntTile label="Google Auth" status={integrations.google_auth} />
          </div>
        </Card>
      </div>

      <style>{`.inp{width:100%;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;background:white}.inp:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.15)}`}</style>
    </SaaSAdminLayout>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <Icon className="w-4 h-4 text-sky-600" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, compact, children }) {
  return (
    <div className={compact ? "" : "space-y-1"}>
      <label className="text-[11px] font-semibold text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange, testid }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-[11px] text-gray-500">{description}</p>
      </div>
      <button onClick={() => onChange(!checked)} className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-sky-600" : "bg-gray-300"}`} data-testid={testid}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function SaveBtn({ onClick, saving, testid }) {
  return (
    <div className="pt-1">
      <button onClick={onClick} disabled={saving} className="inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50" data-testid={testid}>
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
      </button>
    </div>
  );
}

function IntTile({ label, status, extra }) {
  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${status ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
      {status ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold truncate ${status ? "text-emerald-800" : "text-gray-600"}`}>{label}</p>
        {extra && <p className="text-[9px] text-gray-500">{extra}</p>}
      </div>
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const go = async () => { try { await navigator.clipboard.writeText(text || ""); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* noop */ } };
  return (
    <button onClick={go} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Copy">
      <Copy className="w-3.5 h-3.5" />
      {copied && <span className="absolute -mt-6 text-[9px] text-emerald-600">Copied</span>}
    </button>
  );
}

function LogoUploader({ token, onFlash }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [removeDark, setRemoveDark] = useState(true);
  const [cacheBust, setCacheBust] = useState(Date.now());

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      onFlash("error", "Please choose an image file");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      onFlash("error", "Image too large (max 10 MB)");
      return;
    }
    const url = URL.createObjectURL(f);
    setPreview({ file: f, url, name: f.name, sizeKB: Math.round(f.size / 1024) });
  };

  const upload = async () => {
    if (!preview?.file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", preview.file);
      fd.append("remove_dark_bg", removeDark ? "true" : "false");
      const r = await fetch(`${API}/memoraai/saas-admin/upload-logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Upload failed");
      onFlash("success", `Logo updated (${d.logo_size_kb} KB) — refresh other tabs to see changes`);
      setCacheBust(Date.now());
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      onFlash("error", e.message || String(e));
    }
    setBusy(false);
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm" data-testid="logo-uploader-card">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <ImageIcon className="w-4 h-4 text-sky-600" />
        <h3 className="text-sm font-semibold text-gray-900">Brand Logo</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Current logo preview */}
        <div>
          <p className="text-[11px] font-semibold text-gray-600 mb-1.5">Current logo</p>
          <div className="rounded-xl border border-gray-200 bg-slate-900 p-4 flex items-center justify-center min-h-[120px]" data-testid="current-logo-preview">
            <img
              src={`/memoraai-logo.png?v=${cacheBust}`}
              alt="Current MemoraAI logo"
              className="max-h-20 w-auto object-contain"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Path: <code className="bg-gray-100 px-1 rounded">/memoraai-logo.png</code></p>
        </div>

        {/* Upload zone */}
        <div>
          <p className="text-[11px] font-semibold text-gray-600 mb-1.5">Upload new logo</p>
          <label
            className="block rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 transition-colors cursor-pointer p-4 text-center"
            data-testid="logo-dropzone"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onPick}
              data-testid="logo-file-input"
            />
            {preview ? (
              <div className="space-y-2">
                <div className="rounded-lg bg-slate-900 p-3 flex items-center justify-center">
                  <img src={preview.url} alt="preview" className="max-h-20 object-contain" data-testid="logo-preview-img" />
                </div>
                <p className="text-[11px] text-gray-700 truncate">{preview.name} <span className="text-gray-400">· {preview.sizeKB} KB</span></p>
                <p className="text-[10px] text-sky-600">Click to choose a different file</p>
              </div>
            ) : (
              <div className="py-3">
                <Upload className="w-6 h-6 text-sky-500 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-gray-700">Click to browse</p>
                <p className="text-[10px] text-gray-500 mt-0.5">PNG, JPG, or WebP · max 10 MB</p>
              </div>
            )}
          </label>

          <label className="flex items-start gap-2 mt-3 cursor-pointer" data-testid="remove-dark-bg-toggle">
            <input type="checkbox" checked={removeDark} onChange={e => setRemoveDark(e.target.checked)} className="mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-gray-700">Auto-remove dark background</p>
              <p className="text-[10px] text-gray-500">Recommended if your logo is on a black/navy backdrop. Makes background transparent and crops tightly.</p>
            </div>
          </label>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={upload}
              disabled={!preview || busy}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="upload-logo-btn"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {busy ? "Uploading…" : "Replace Logo"}
            </button>
            <button
              onClick={() => setCacheBust(Date.now())}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg"
              title="Reload preview"
              data-testid="logo-refresh-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 mt-3">
        Replaces the public logo and the square app icon. Cached browsers may take a moment to show the new version — append <code className="bg-gray-100 px-1 rounded">?v=…</code> to bust cache or force-refresh.
      </p>
    </section>
  );
}
