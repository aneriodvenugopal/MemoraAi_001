import React, { useState, useEffect, useCallback } from "react";
import {
  Building, X, Save, Loader2, ShieldCheck, KeyRound, Phone,
  MessageSquare, MapPin, Mail, User, Copy, RotateCw, CheckCircle2, AlertCircle
} from "lucide-react";
import SearchableSelect from "./SearchableSelect";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EditBusinessModal({ tenant, onClose, onSaved }) {
  const [tab, setTab] = useState("profile");   // 'profile' | 'waba' | 'security'
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [newPassword, setNewPassword] = useState(null);
  const [categories, setCategories] = useState([]);
  const [wabaConfig, setWabaConfig] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const authOnly = { Authorization: `Bearer ${token}` };

  const [profile, setProfile] = useState({
    business_name: tenant?.name || "",
    category: tenant?.category || "",
    city: tenant?.city || "",
    logo_url: tenant?.logo_url || "",
    owner_name: tenant?.owner_name || "",
    owner_email: tenant?.owner_email || "",
    plan: tenant?.plan || tenant?.subscription_status || "trial",
    is_active: tenant?.is_active !== false,
  });

  const [waba, setWaba] = useState({
    waba_id: "",
    phone_number_id: "",
    phone_number: "",
    access_token: "",
    business_name_on_wa: "",
  });

  const load = useCallback(async () => {
    try {
      const [catsR, detailR] = await Promise.all([
        fetch(`${API}/memoraai/saas-admin/business-categories`, { headers: authOnly }).then(r => r.ok ? r.json() : { categories: [] }),
        fetch(`${API}/memoraai/saas-admin/tenants/${tenant.id}`, { headers: authOnly }).then(r => r.ok ? r.json() : null),
      ]);
      setCategories(catsR.categories || []);
      if (detailR) {
        const t = detailR.tenant || detailR;
        setProfile(p => ({
          ...p,
          business_name: t.name || t.company_name || p.business_name,
          category: t.business_category || p.category,
          city: t.city || p.city,
          logo_url: t.logo_url || p.logo_url,
          owner_name: t.owner_name || p.owner_name,
          owner_email: t.owner_email || p.owner_email,
          plan: t.subscription_status || p.plan,
          is_active: t.is_active !== false,
        }));
        const w = detailR.waba_config || detailR.waba;
        if (w) {
          setWabaConfig(w);
          setWaba(() => ({
            waba_id: w.waba_id || "",
            phone_number_id: w.phone_number_id || "",
            phone_number: w.phone_number || "",
            access_token: "",  // never show the real token; user pastes new one if changing
            business_name_on_wa: w.business_name || "",
          }));
        }
      }
    } catch (e) { /* silent */ }
  }, [tenant?.id, token]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    setSaving(true); setError(""); setOk("");
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/tenants/${tenant.id}`, {
        method: "PUT", headers, body: JSON.stringify(profile),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Update failed");
      setOk("Business profile updated");
      onSaved && onSaved();
    } catch (e) { setError(e.message || String(e)); }
    setSaving(false);
  };

  const saveWABA = async () => {
    if (!waba.waba_id || !waba.phone_number_id || !waba.access_token) {
      setError("WABA ID, Phone Number ID, and Access Token are required"); return;
    }
    setSaving(true); setError(""); setOk("");
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/tenants/${tenant.id}/waba`, {
        method: "POST", headers, body: JSON.stringify(waba),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "WABA save failed");
      setOk("WABA credentials saved. Click 'Verify' to activate.");
      await load();
    } catch (e) { setError(e.message || String(e)); }
    setSaving(false);
  };

  const verifyWABA = async () => {
    setVerifying(true); setVerifyResult(null);
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/tenants/${tenant.id}/waba/verify`, {
        method: "POST", headers,
      });
      const data = await r.json();
      setVerifyResult(data);
      if (data.verified) { setOk("WhatsApp Business verified & activated ✅"); await load(); }
    } catch (e) { setVerifyResult({ verified: false, error: String(e) }); }
    setVerifying(false);
  };

  const resetPassword = async () => {
    if (!window.confirm("Generate a fresh login password for the owner? The current password will stop working.")) return;
    setSaving(true); setError(""); setOk("");
    try {
      const r = await fetch(`${API}/memoraai/saas-admin/tenants/${tenant.id}/reset-password`, {
        method: "POST", headers,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || "Reset failed");
      setNewPassword(data);
      setOk("New password generated. Share it with the owner.");
    } catch (e) { setError(e.message || String(e)); }
    setSaving(false);
  };

  const copy = (txt) => { try { navigator.clipboard.writeText(txt); } catch { /* noop */ } };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" onClick={onClose} data-testid="edit-business-modal">
      <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden min-h-screen sm:min-h-0 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">{tenant?.name || "Business"}</h2>
              <p className="text-[11px] text-sky-100">Edit profile, WhatsApp credentials & security</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg" data-testid="edit-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-3 border-b border-gray-200 flex gap-1 overflow-x-auto sticky top-0 bg-white z-10">
          {[
            { key: "profile", label: "Profile", icon: Building },
            { key: "waba", label: "WhatsApp", icon: MessageSquare },
            { key: "security", label: "Security", icon: KeyRound },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(""); setOk(""); }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 border-b-2 ${tab === t.key ? "border-sky-600 text-sky-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
              data-testid={`edit-tab-${t.key}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 flex-1 overflow-y-auto">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 mt-0.5" />{error}</div>}
          {ok && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2 rounded-lg flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />{ok}</div>}

          {tab === "profile" && (
            <div className="space-y-3" data-testid="tab-profile">
              <FieldWiz label="Business Name *" icon={Building}>
                <input value={profile.business_name} onChange={e => setProfile(p => ({ ...p, business_name: e.target.value }))} className="input-wiz" data-testid="edit-business-name" />
              </FieldWiz>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWiz label="Category" icon={Building}>
                  <SearchableSelect
                    value={profile.category}
                    onChange={(v) => setProfile(p => ({ ...p, category: v }))}
                    options={categories.map(c => ({ value: c.slug, label: c.name }))}
                    placeholder="Select category"
                    searchPlaceholder="Search..."
                    testid="edit-category"
                  />
                </FieldWiz>
                <FieldWiz label="City" icon={MapPin}>
                  <input value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} className="input-wiz" data-testid="edit-city" />
                </FieldWiz>
              </div>
              <FieldWiz label="Logo URL" icon={Building}>
                <input value={profile.logo_url} onChange={e => setProfile(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://..." className="input-wiz" data-testid="edit-logo-url" />
                {profile.logo_url && (
                  <img src={profile.logo_url} alt="logo" className="mt-2 h-12 w-12 object-contain border border-gray-200 rounded-lg p-1" onError={(e) => { e.target.style.display = 'none'; }} />
                )}
              </FieldWiz>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWiz label="Owner Name" icon={User}>
                  <input value={profile.owner_name} onChange={e => setProfile(p => ({ ...p, owner_name: e.target.value }))} className="input-wiz" data-testid="edit-owner-name" />
                </FieldWiz>
                <FieldWiz label="Owner Email" icon={Mail}>
                  <input value={profile.owner_email} onChange={e => setProfile(p => ({ ...p, owner_email: e.target.value }))} className="input-wiz" data-testid="edit-owner-email" />
                </FieldWiz>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldWiz label="Plan">
                  <select value={profile.plan} onChange={e => setProfile(p => ({ ...p, plan: e.target.value }))} className="input-wiz" data-testid="edit-plan">
                    <option value="trial">Trial</option>
                    <option value="starter">Starter</option>
                    <option value="business">Business</option>
                    <option value="premium">Premium</option>
                  </select>
                </FieldWiz>
                <FieldWiz label="Status">
                  <select value={profile.is_active ? "active" : "paused"} onChange={e => setProfile(p => ({ ...p, is_active: e.target.value === "active" }))} className="input-wiz" data-testid="edit-status">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </FieldWiz>
              </div>
            </div>
          )}

          {tab === "waba" && (
            <div className="space-y-3" data-testid="tab-waba">
              {wabaConfig?.is_verified && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex gap-2">
                  <ShieldCheck className="w-4 h-4 mt-0.5" />
                  Verified with Meta — messaging is active. Updating creds below will re-verify.
                </div>
              )}
              <FieldWiz label="WhatsApp Business Account ID (WABA ID)" icon={MessageSquare}>
                <input value={waba.waba_id} onChange={e => setWaba(w => ({ ...w, waba_id: e.target.value }))} className="input-wiz" data-testid="edit-waba-id" />
              </FieldWiz>
              <FieldWiz label="Phone Number ID" icon={Phone}>
                <input value={waba.phone_number_id} onChange={e => setWaba(w => ({ ...w, phone_number_id: e.target.value }))} className="input-wiz" data-testid="edit-phone-number-id" />
              </FieldWiz>
              <FieldWiz label="Phone (E.164)" icon={Phone}>
                <input value={waba.phone_number} onChange={e => setWaba(w => ({ ...w, phone_number: e.target.value }))} placeholder="+919948303060" className="input-wiz" data-testid="edit-phone-number" />
              </FieldWiz>
              <FieldWiz label="Meta Permanent Access Token" icon={KeyRound}>
                <textarea rows={3} value={waba.access_token} onChange={e => setWaba(w => ({ ...w, access_token: e.target.value }))} placeholder={wabaConfig?.access_token_masked ? `Current: ${wabaConfig.access_token_masked} (paste a new one to replace)` : "EAAB..."} className="input-wiz font-mono text-[11px]" data-testid="edit-access-token" />
              </FieldWiz>
              <FieldWiz label="Business Name on WhatsApp" icon={Building}>
                <input value={waba.business_name_on_wa} onChange={e => setWaba(w => ({ ...w, business_name_on_wa: e.target.value }))} className="input-wiz" data-testid="edit-biz-name-wa" />
              </FieldWiz>

              {wabaConfig?.phone_number_id && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">Meta Graph Verification</p>
                    <p className="text-[11px] text-gray-500">Ping Meta to confirm these credentials work live.</p>
                  </div>
                  <button onClick={verifyWABA} disabled={verifying}
                    className="flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                    data-testid="edit-verify-waba">
                    {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Verify
                  </button>
                </div>
              )}
              {verifyResult && (
                <div className={`text-[11px] px-2 py-1.5 rounded-md ${verifyResult.verified ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="edit-verify-result">
                  {verifyResult.verified ? `✅ Verified — ${verifyResult.phone_data?.verified_name || "OK"}` : `❌ ${verifyResult.error || "Verification failed"}`}
                </div>
              )}
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-3" data-testid="tab-security">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg">
                Generate a new password for the business owner if they lost access. Old password will stop working immediately.
              </div>
              <button onClick={resetPassword} disabled={saving}
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50"
                data-testid="reset-password-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} Generate New Password
              </button>
              {newPassword && (
                <div className="space-y-2">
                  <CredRow label="Login Phone" value={newPassword.phone} onCopy={() => copy(newPassword.phone)} />
                  <CredRow label="New Password" value={newPassword.new_password} onCopy={() => copy(newPassword.new_password)} dark />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100" data-testid="edit-cancel">Close</button>
          {tab === "profile" && (
            <button onClick={saveProfile} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50" data-testid="save-profile-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
            </button>
          )}
          {tab === "waba" && (
            <button onClick={saveWABA} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50" data-testid="save-waba-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save WABA
            </button>
          )}
        </div>
      </div>

      <style>{`.input-wiz { width: 100%; padding: 9px 12px; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 13px; background: white; } .input-wiz:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15); }`}</style>
    </div>
  );
}

function FieldWiz({ label, icon: Icon, children }) {
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

function CredRow({ label, value, onCopy, dark }) {
  const [copied, setCopied] = useState(false);
  const go = () => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return (
    <div className={`rounded-xl p-3 border ${dark ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
      <p className={`text-[10px] uppercase font-semibold tracking-widest ${dark ? "text-sky-300" : "text-gray-500"}`}>{label}</p>
      <div className="flex items-center justify-between mt-0.5 gap-2">
        <code className={`text-sm font-mono font-bold truncate ${dark ? "text-white" : "text-gray-900"}`}>{value}</code>
        <button onClick={go} className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded ${dark ? "bg-white/10 text-sky-300" : "text-sky-600"}`}>
          <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
