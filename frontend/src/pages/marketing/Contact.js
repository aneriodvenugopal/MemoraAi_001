import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Brain, MessageSquare, Mail, Phone, MapPin, Send,
  Loader2, CheckCircle2, Globe, Building2
} from 'lucide-react';
import MemoraLogo from '../../components/MemoraLogo';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSending(true); setError('');
    try {
      const r = await fetch(`${API}/memoraai/landing/lead`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'contact_page' }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Failed to submit');
      }
      setSent(true);
    } catch (err) { setError(err.message || String(err)); }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <nav className="sticky top-0 z-30 bg-[#0a0e27]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <MemoraLogo variant="compact" tone="dark" size="sm" to="/" />
          <Link to="/" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back home
          </Link>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12" data-testid="contact-hero">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Talk to the team</h1>
          <p className="text-base text-gray-400 mt-3 max-w-2xl mx-auto">
            Sales, support, partnership, or product feedback — we read every message and reply within 4 working hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Contact form */}
          <div className="lg:col-span-3 bg-white/[0.03] border border-white/5 rounded-3xl p-6 sm:p-8" data-testid="contact-form-card">
            {sent ? (
              <div className="text-center py-8" data-testid="contact-success">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="font-bold text-lg">Message received</h3>
                <p className="text-sm text-gray-400 mt-1">We'll get back to you on WhatsApp / email within 4 hours.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h2 className="text-xl font-bold mb-2">Send a message</h2>
                {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-lg" data-testid="contact-error">{error}</div>}
                <Field label="Your Name *">
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="cinp" data-testid="c-name" />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Email *">
                    <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="cinp" data-testid="c-email" />
                  </Field>
                  <Field label="Phone / WhatsApp">
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="cinp" data-testid="c-phone" />
                  </Field>
                </div>
                <Field label="Tell us about your business">
                  <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="What industry, how many leads/month, biggest WhatsApp problem..." className="cinp" data-testid="c-message" />
                </Field>
                <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50" data-testid="contact-submit">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          {/* Contact info */}
          <div className="lg:col-span-2 space-y-3" data-testid="contact-info">
            <div className="bg-gradient-to-br from-[#25D366]/15 to-[#1ebc56]/10 border border-[#25D366]/20 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-[#25D366]" />
                <h3 className="font-bold">WhatsApp Us — Fastest</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">We reply within minutes during business hours (Mon–Sat, 10 AM – 8 PM IST).</p>
              <a href="https://wa.me/916309356590?text=Hi%20MemoraAI%20team" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold px-4 py-2 rounded-full">
                <MessageSquare className="w-4 h-4" /> +91 6309 356 590
              </a>
            </div>

            <ContactRow icon={Mail} label="Email" value="info@memoraai.in" link="mailto:info@memoraai.in" testid="c-email-link" />
            <ContactRow icon={Phone} label="Phone" value="+91 6309 356 590" link="tel:+916309356590" />
            <ContactRow icon={MapPin} label="Office" value="Hyderabad, Telangana, India" />
            <ContactRow icon={Globe} label="Parent Company" value="Eloniot Software Solutions" link="https://eloniot.com" />

            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 text-[11px] text-gray-400 leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-violet-400" />
                <span className="font-semibold text-white">Legal Entity</span>
              </div>
              MemoraAI is owned and operated by <span className="text-violet-300 font-semibold">Eloniot Software Solutions</span>,
              Hyderabad, India. GSTIN available on request. All payments are processed via PCI-DSS compliant gateways
              (Razorpay / Stripe / PayU). For invoices, contact <a href="mailto:info@memoraai.in" className="text-violet-300 hover:text-violet-200">info@memoraai.in</a>.
            </div>
          </div>
        </div>
      </section>

      <style>{`.cinp{width:100%;padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;font-size:13px;color:#fff}.cinp:focus{outline:none;border-color:rgba(139,92,246,.5);background:rgba(255,255,255,.05)}.cinp::placeholder{color:#6b7280}`}</style>
    </div>
  );
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function ContactRow({ icon: Icon, label, value, link, testid }) {
  const Wrap = link ? 'a' : 'div';
  const props = link ? { href: link, target: link.startsWith('http') ? '_blank' : undefined, rel: 'noreferrer' } : {};
  return (
    <Wrap {...props} data-testid={testid} className="flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 group hover:border-violet-500/30 transition-colors">
      <Icon className="w-4 h-4 text-violet-400 mt-1 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">{label}</p>
        <p className={`text-sm font-medium ${link ? 'text-violet-300 group-hover:text-violet-200' : 'text-gray-200'}`}>{value}</p>
      </div>
    </Wrap>
  );
}

export default Contact;
