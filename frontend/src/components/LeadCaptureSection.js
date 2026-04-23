import React, { useState } from 'react';
import { CheckCircle2, Loader2, Phone, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const INDUSTRIES = [
  "Real Estate", "Clinic / Hospital", "Astrology", "Beauty Salon",
  "Coaching Centre", "Function Hall", "Gym / Fitness", "Auto Dealer",
  "Restaurant", "Pesticides / Fertilizer", "Agriculture", "Retail Shop",
  "Construction / Builder", "Legal / CA", "Other",
];

export default function LeadCaptureSection({ variant = "full", source = "homepage" }) {
  const [form, setForm] = useState({
    name: "", phone: "", business_name: "", industry: "", message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const getUTM = () => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return {
        utm_source: sp.get("utm_source"),
        utm_medium: sp.get("utm_medium"),
        utm_campaign: sp.get("utm_campaign"),
      };
    } catch { return {}; }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10))) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    if (form.name.trim().length < 2) {
      setError("Please enter your name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/memoraai/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source, ...getUTM() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Couldn't submit. Please try again.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className={`bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-8 text-white text-center ${variant === 'compact' ? '' : 'max-w-xl mx-auto'}`} data-testid="lead-form-success">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-white/90" />
        <h3 className="text-2xl font-bold mb-2">We'll call you within 2 hours</h3>
        <p className="text-sky-100">Our team will reach out to <strong>{form.phone}</strong> with a personalised demo for <strong>{form.industry || "your business"}</strong>. Expect pricing, WhatsApp setup timeline, and a 10-minute live walkthrough.</p>
        <p className="text-sky-200 text-xs mt-4">Meanwhile — save <strong>+91 63093 56590</strong> to your contacts and say "MemoraAI demo" on WhatsApp to skip the wait.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}
      className={`relative bg-white rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-500/10 border border-sky-100 ${variant === 'compact' ? '' : 'max-w-xl mx-auto'}`}
      data-testid="lead-capture-form">
      <div className="absolute -top-4 left-6 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
        <Sparkles className="w-3 h-3" /> Free Demo
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mb-1">Get a 10-min live demo</h3>
      <p className="text-sm text-gray-600 mb-5">See MemoraAI handle real customer questions for <strong>your business</strong> — on WhatsApp, in your language.</p>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Your Name *</span>
            <input type="text" required value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="E.g., Ramesh Kumar"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              data-testid="lead-input-name" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-600 mb-1 block">WhatsApp Number *</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">+91</span>
              <input type="tel" required value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="10-digit mobile"
                maxLength="10"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                data-testid="lead-input-phone" />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Business Name</span>
            <input type="text" value={form.business_name}
              onChange={e => setForm({ ...form, business_name: e.target.value })}
              placeholder="E.g., Ramesh Clinic"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              data-testid="lead-input-business" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Industry</span>
            <select value={form.industry}
              onChange={e => setForm({ ...form, industry: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              data-testid="lead-input-industry">
              <option value="">Select industry…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold text-gray-600 mb-1 block">What would you like to automate?</span>
          <textarea value={form.message} rows="2"
            onChange={e => setForm({ ...form, message: e.target.value })}
            placeholder="E.g., Booking appointments, sending brochures, following up on old leads…"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            data-testid="lead-input-message" />
        </label>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1" data-testid="lead-form-error">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}

        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-base py-3.5 rounded-xl shadow-lg shadow-sky-500/30 transition-all disabled:opacity-60"
          data-testid="lead-submit-btn">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Request Free Demo <ArrowRight className="w-5 h-5" /></>}
        </button>

        <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500 pt-1">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Call in 2 hours</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> No credit card</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> English / हिन्दी / తెలుగు</span>
        </div>
      </div>
    </form>
  );
}

/* Floating WhatsApp CTA — drop anywhere on marketing pages */
export function WhatsAppFloatingCTA({ number = "916309356590", label = "Chat on WhatsApp" }) {
  const href = `https://wa.me/${number}?text=${encodeURIComponent("Hi MemoraAI, I'd like a demo for my business.")}`;
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[#25D366] hover:bg-[#22c55e] text-white font-semibold px-4 py-3 rounded-full shadow-xl shadow-green-500/30 animate-pulse-slow"
      data-testid="whatsapp-float-cta">
      <Phone className="w-5 h-5" />
      <span className="hidden sm:inline text-sm">{label}</span>
    </a>
  );
}
