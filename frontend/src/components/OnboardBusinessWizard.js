import React, { useState, useEffect, useCallback } from "react";
import {
  Building, User, Phone, Mail, ShieldCheck, CheckCircle2, X,
  Loader2, Copy, Key, ArrowRight, ArrowLeft, MapPin, Upload,
  MessageSquare, KeyRound, FileText, Sparkles
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  { key: "business", label: "Business", icon: Building },
  { key: "owner",    label: "Owner",    icon: User },
  { key: "waba",     label: "WhatsApp", icon: MessageSquare },
  { key: "done",     label: "Done",     icon: CheckCircle2 },
];

export default function OnboardBusinessWizard({ onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);  // success payload

  const [form, setForm] = useState({
    business_name: "",
    category: "",
    city: "",
    logo_url: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    plan: "trial",
    waba_id: "",
    phone_number_id: "",
    phone_number: "",
    access_token: "",
    business_name_on_wa: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const authOnly = { Authorization: `Bearer ${token}` };

  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/business-categories`, { headers: authOnly });
      if (r.ok) setCategories((await r.json()).categories || []);
    } catch (e) { /* silent */ }
  }, [token]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.business_name.trim() && form.category;
    if (step === 1) return form.owner_name.trim() && form.owner_phone.trim().length >= 10;
    if (step === 2) return true; // WABA optional
    return true;
  };

  const next = () => {
    setError("");
    if (!canNext()) {
      setError("Please fill required fields marked with *");
      return;
    }
    setStep(s => Math.min(3, s + 1));
  };

  const back = () => {
    setError("");
    setStep(s => Math.max(0, s - 1));
  };

  const submit = async () => {
    setSaving(true); setError("");
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/tenants`, {
        method: "POST", headers, body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Onboarding failed");
      setResult(data);
      setStep(3);
      onSuccess && onSuccess(data);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const verifyWABA = async () => {
    if (!result?.tenant_id) return;
    setVerifying(true); setVerifyResult(null);
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/tenants/${result.tenant_id}/waba/verify`, {
        method: "POST", headers,
      });
      const data = await r.json();
      setVerifyResult(data);
    } catch (e) {
      setVerifyResult({ verified: false, error: String(e) });
    } finally {
      setVerifying(false);
    }
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" onClick={step === 3 ? undefined : onClose} data-testid="onboard-wizard">
      <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden min-h-screen sm:min-h-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-4 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <h2 className="font-bold">Register New Business</h2>
              <p className="text-[11px] text-sky-100">Onboard a client to MemoraAI in 3 steps</p>
            </div>
          </div>
          {step !== 3 && (
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg" data-testid="wizard-close">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => {
            const active = step === i;
            const done = step > i;
            const SIcon = s.icon;
            return (
              <React.Fragment key={s.key}>
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0 ${active ? "text-sky-700" : done ? "text-emerald-600" : "text-gray-400"}`} data-testid={`step-${s.key}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${active ? "bg-sky-100" : done ? "bg-emerald-100" : "bg-gray-100"}`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <SIcon className="w-3.5 h-3.5" />}
                  </div>
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 w-8 ${done ? "bg-emerald-200" : "bg-gray-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step bodies */}
        <div className="p-5 space-y-3">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg" data-testid="wizard-error">{error}</div>
          )}

          {step === 0 && (
            <div className="space-y-3" data-testid="step-business-body">
              <Field label="Business Name *" icon={Building}>
                <input value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="E.g., Eloniot Software Solutions" className="input-wiz" data-testid="f-business-name" />
              </Field>
              <Field label="Business Category *" icon={Sparkles}>
                <select value={form.category} onChange={e => set("category", e.target.value)} className="input-wiz" data-testid="f-category">
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="City" icon={MapPin}>
                  <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="E.g., Hyderabad" className="input-wiz" data-testid="f-city" />
                </Field>
                <Field label="Plan" icon={Key}>
                  <select value={form.plan} onChange={e => set("plan", e.target.value)} className="input-wiz" data-testid="f-plan">
                    <option value="trial">Trial (14 days)</option>
                    <option value="starter">Starter</option>
                    <option value="business">Business</option>
                    <option value="premium">Premium</option>
                  </select>
                </Field>
              </div>
              <Field label="Logo URL (optional)" icon={Upload}>
                <input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." className="input-wiz" data-testid="f-logo-url" />
                <p className="text-[10px] text-gray-400 mt-1">Paste any public image URL for the business logo. File upload coming soon.</p>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3" data-testid="step-owner-body">
              <Field label="Owner Name *" icon={User}>
                <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)} placeholder="E.g., Venugopal" className="input-wiz" data-testid="f-owner-name" />
              </Field>
              <Field label="Owner Phone / WhatsApp *" icon={Phone}>
                <input value={form.owner_phone} onChange={e => set("owner_phone", e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="10-12 digit mobile" className="input-wiz" data-testid="f-owner-phone" />
                <p className="text-[10px] text-gray-400 mt-1">This becomes the owner's login ID. Used as-is (no + prefix).</p>
              </Field>
              <Field label="Owner Email" icon={Mail}>
                <input type="email" value={form.owner_email} onChange={e => set("owner_email", e.target.value)} placeholder="owner@business.com" className="input-wiz" data-testid="f-owner-email" />
              </Field>
              <div className="bg-sky-50 border border-sky-100 text-sky-800 text-xs p-3 rounded-lg flex gap-2">
                <KeyRound className="w-4 h-4 mt-0.5 flex-shrink-0" />
                A secure password will be auto-generated and shown on the last step so you can share it with the business owner.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3" data-testid="step-waba-body">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span><b>Optional.</b> If the client already has their Meta permanent token, paste it here. You can always add/edit later from the business profile.</span>
              </div>
              <Field label="WhatsApp Business Account ID (WABA ID)" icon={MessageSquare}>
                <input value={form.waba_id} onChange={e => set("waba_id", e.target.value)} placeholder="e.g., 123456789012345" className="input-wiz" data-testid="f-waba-id" />
              </Field>
              <Field label="Phone Number ID" icon={Phone}>
                <input value={form.phone_number_id} onChange={e => set("phone_number_id", e.target.value)} placeholder="e.g., 102345678901234" className="input-wiz" data-testid="f-phone-number-id" />
              </Field>
              <Field label="WhatsApp Phone (E.164)" icon={Phone}>
                <input value={form.phone_number} onChange={e => set("phone_number", e.target.value)} placeholder="+919948303060" className="input-wiz" data-testid="f-phone-number" />
              </Field>
              <Field label="Meta Permanent Access Token" icon={KeyRound}>
                <textarea rows={3} value={form.access_token} onChange={e => set("access_token", e.target.value)} placeholder="EAAB..." className="input-wiz font-mono text-[11px]" data-testid="f-access-token" />
                <p className="text-[10px] text-gray-400 mt-1">
                  Get it from developers.facebook.com → your app → WhatsApp → API Setup → Permanent Token.
                </p>
              </Field>
              <Field label="Verified Business Name on WhatsApp (optional)" icon={FileText}>
                <input value={form.business_name_on_wa} onChange={e => set("business_name_on_wa", e.target.value)} placeholder="Shown on WhatsApp profile" className="input-wiz" data-testid="f-business-name-on-wa" />
              </Field>
            </div>
          )}

          {step === 3 && result && (
            <div className="space-y-3" data-testid="step-done-body">
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{result.business_name} onboarded</h3>
                <p className="text-xs text-gray-500 mt-0.5">Share these login details with the owner.</p>
              </div>

              <CredentialBox label="Login Phone" value={result.login.phone} onCopy={() => copy(result.login.phone)} testid="cred-phone" />
              <CredentialBox label="Temporary Password" value={result.login.password} onCopy={() => copy(result.login.password)} testid="cred-password" dark />
              <CredentialBox label="Login URL" value={result.login.login_url} onCopy={() => copy(result.login.login_url)} testid="cred-url" />

              {result.waba_saved ? (
                <div className="bg-white border border-sky-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-900">WhatsApp credentials saved</p>
                      <p className="text-[11px] text-gray-500">Verify with Meta Graph to activate messaging.</p>
                    </div>
                    <button onClick={verifyWABA} disabled={verifying}
                      className="flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                      data-testid="verify-waba-btn">
                      {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Verify WABA
                    </button>
                  </div>
                  {verifyResult && (
                    <div className={`mt-2 text-[11px] px-2 py-1.5 rounded-md ${verifyResult.verified ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="verify-result">
                      {verifyResult.verified
                        ? `✅ Verified — ${verifyResult.phone_data?.verified_name || "connection OK"}`
                        : `❌ ${verifyResult.error || "Verification failed"}`}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 text-gray-600 text-[11px] p-3 rounded-lg">
                  WhatsApp credentials not added yet. Owner can self-setup from Integrations, or you can add them later from the business profile.
                </div>
              )}

              <p className="text-[11px] text-gray-500 text-center pt-1">
                Use "Login as" on the dashboard to impersonate the owner and finish content uploads on their behalf.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex gap-2 sticky bottom-0">
          {step > 0 && step < 3 && (
            <button onClick={back} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg" data-testid="wizard-back">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < 2 && (
            <button onClick={next} disabled={!canNext()} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-40" data-testid="wizard-next">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 2 && (
            <button onClick={submit} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-40" data-testid="wizard-submit">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Create Business
            </button>
          )}
          {step === 3 && (
            <button onClick={onClose} className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg" data-testid="wizard-done">
              Done
            </button>
          )}
        </div>
      </div>

      <style>{`.input-wiz { width: 100%; padding: 9px 12px; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 13px; background: white; } .input-wiz:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }`}</style>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 text-gray-400" />}
        {label}
      </span>
      {children}
    </label>
  );
}

function CredentialBox({ label, value, onCopy, testid, dark }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => { await onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return (
    <div className={`rounded-xl p-3 border ${dark ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-200"}`} data-testid={testid}>
      <p className={`text-[10px] uppercase font-semibold tracking-widest ${dark ? "text-sky-300" : "text-gray-500"}`}>{label}</p>
      <div className="flex items-center justify-between mt-0.5 gap-2">
        <code className={`text-sm font-mono font-bold truncate ${dark ? "text-white" : "text-gray-900"}`}>{value}</code>
        <button onClick={doCopy} className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded ${dark ? "bg-white/10 text-sky-300 hover:text-sky-200" : "text-sky-600 hover:text-sky-700"}`}>
          <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
