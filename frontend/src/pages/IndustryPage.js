import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Brain, CheckCircle, MessageSquare, ArrowRight, Phone,
  ChevronRight, Shield, Zap, Star, Play
} from 'lucide-react';
import { WhatsAppMockup } from './marketing/Home';

const API = process.env.REACT_APP_BACKEND_URL;
const WHATSAPP_NUMBER = "916309356590";

function openWhatsApp(msg) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

export default function IndustryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [industry, setIndustry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/memoraai/industries/public/${slug}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(d => { setIndustry(d.industry); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
    </div>
  );

  if (!industry) return (
    <div className="min-h-screen bg-[#0a0e27] text-white flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Industry not found</p>
      <Link to="/" className="text-violet-400 hover:text-violet-300 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white" data-testid="industry-page">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e27]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Memora<span className="text-violet-400">AI</span></span>
          </Link>
          <button onClick={() => navigate('/register')}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold" data-testid="nav-demo-btn">
            Start Free Demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 px-4 relative" data-testid="industry-hero">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-400 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Industries
          </Link>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <Star className="w-4 h-4" /> {industry.title}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">{industry.hero_title}</h1>
              <p className="text-lg text-gray-400 max-w-xl mb-8 leading-relaxed">{industry.hero_sub}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate('/register')}
                  className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-lg font-bold hover:from-violet-700 hover:to-blue-700 transition-all shadow-2xl shadow-violet-600/30 flex items-center justify-center gap-3" data-testid="industry-demo-btn">
                  Start Free Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => openWhatsApp(`Hi, I want MemoraAI for my ${industry.title} business.`)}
                  className="px-8 py-4 rounded-2xl bg-[#25D366] text-white text-lg font-bold hover:bg-[#20bd5a] transition-all shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-3" data-testid="industry-wa-btn">
                  <MessageSquare className="w-5 h-5" /> Talk to MemoraAI
                </button>
              </div>
            </div>
            {/* WhatsApp Demo */}
            <div>
              <WhatsAppMockup businessName={industry.business_name} messages={industry.demo_chat || []} />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 border-t border-white/5" data-testid="industry-benefits">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Problems <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-[#25D366]">MemoraAI Solves</span> for {industry.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(industry.benefits || []).map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5" data-testid={`benefit-${i}`}>
                <CheckCircle className="w-5 h-5 text-[#25D366] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-300">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Memory Use Cases */}
      <section className="py-16 px-4" data-testid="industry-usecases">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            How <span className="text-violet-400">Memory AI</span> Works for {industry.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: "Remembers Everything", desc: `Customer names, past inquiries, preferences, follow-up history — all recalled instantly for ${industry.title}.` },
              { icon: Zap, title: "Detects Buying Intent", desc: "AI identifies when a customer is ready to buy, book, or convert — sends instant alerts to your team." },
              { icon: Shield, title: "Builds Trust", desc: "When customers feel remembered, they trust more, buy more, and refer more. That's the MemoraAI difference." },
            ].map((u, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-center" data-testid={`usecase-${i}`}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-600/20">
                  <u.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{u.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 relative" data-testid="industry-cta">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            Ready to Transform Your {industry.title} Business?
          </h2>
          <p className="text-lg text-gray-400 mb-8">Join hundreds of {industry.title.toLowerCase()} businesses using MemoraAI.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/register')}
              className="group px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-lg font-bold shadow-2xl shadow-violet-600/30 flex items-center justify-center gap-3">
              Start Free Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => openWhatsApp(`Hi, I have a ${industry.title} business. I want to try MemoraAI.`)}
              className="px-10 py-4 rounded-2xl bg-[#25D366] text-white text-lg font-bold shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-3">
              <Phone className="w-5 h-5" /> Book Setup Call
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center text-xs text-gray-600">
        2025-2026 MemoraAI by Eloniot Software Solutions. <Link to="/" className="text-violet-400 hover:text-violet-300">Back to Home</Link>
      </footer>

      {/* Floating WhatsApp */}
      <button onClick={() => openWhatsApp(`Hi, I need MemoraAI for ${industry.title}.`)}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-2xl shadow-[#25D366]/30 hover:scale-110 transition-all" data-testid="floating-whatsapp">
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
}
