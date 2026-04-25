import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Brain, MessageSquare, Building2, MapPin, Mail, Phone,
  Award, Globe, Sparkles, Shield, Users
} from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      {/* Header */}
      <nav className="sticky top-0 z-30 bg-[#0a0e27]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <span className="text-lg font-bold">Memora<span className="text-violet-400">AI</span></span>
              <span className="hidden sm:block text-[9px] text-gray-500 font-medium">A product by Eloniot Software Solutions</span>
            </div>
          </Link>
          <Link to="/" className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-14" data-testid="about-hero">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-semibold mb-4">
            <Sparkles className="w-3 h-3" /> About MemoraAI
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Built by an India-based product team that's lived the WhatsApp problem.
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto mt-5">
            MemoraAI is a vertical AI platform for India's WhatsApp-first businesses — built and operated by{' '}
            <a href="https://eloniot.com" target="_blank" rel="noreferrer" className="text-violet-400 font-semibold hover:text-violet-300">Eloniot Software Solutions</a>,
            a Hyderabad-based product company shipping AI for SMBs since 2019.
          </p>
        </div>

        {/* Story */}
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 sm:p-10 mb-10" data-testid="about-story">
          <h2 className="text-2xl font-bold mb-4">Our Story</h2>
          <div className="space-y-4 text-gray-300 leading-relaxed text-sm sm:text-base">
            <p>
              We started Eloniot Software Solutions in 2019 to build internal tools for real estate developers, clinics, and small agencies across South India.
              Across every customer, the same pattern showed up — they were drowning in WhatsApp conversations, losing
              leads after hours, and re-explaining the same questions to the same customer over and over.
            </p>
            <p>
              Off-the-shelf chatbots felt robotic. They couldn't remember context. They couldn't speak Telugu, Hindi or
              colloquial English the way Indian buyers actually type. So we built our own — first as a custom solution
              for a real-estate client, then as a horizontal product called MemoraAI.
            </p>
            <p>
              Today MemoraAI powers WhatsApp automation for businesses across <span className="text-violet-300 font-semibold">19 industries</span> —
              from luxury boutiques and clinics to lawyers, gyms, automobile showrooms and edu-institutes.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10" data-testid="about-values">
          <Value icon={Brain} title="Memory-first AI"
            text="Every customer is remembered. We invested heavily in long-term context (RAG), so repeat buyers feel seen — not asked the same questions twice." />
          <Value icon={Globe} title="Built for Bharat"
            text="Telugu, Hindi, Tamil, Kannada, Marathi, English — the AI replies in whatever language your customer types in. No translation layer, no awkward English." />
          <Value icon={Shield} title="Privacy by design"
            text="Every tenant's data is isolated. We never train shared models on customer chats. Tokens stay encrypted at rest, never logged in plain text." />
        </div>

        {/* Parent Company */}
        <div className="bg-gradient-to-br from-violet-600/10 to-blue-600/10 border border-violet-500/20 rounded-3xl p-8 sm:p-10 mb-10" data-testid="about-parent">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-violet-400" />
            <h2 className="text-2xl font-bold">Parent Company</h2>
          </div>
          <p className="text-lg font-semibold text-white mb-4">Eloniot Software Solutions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-300">
            <Info icon={MapPin} label="Registered Office" value="Hyderabad, Telangana, India" />
            <Info icon={Mail} label="Business Email" value="info@memoraai.in" link="mailto:info@memoraai.in" />
            <Info icon={Phone} label="Support WhatsApp" value="+91 6309 356 590" link="https://wa.me/916309356590" />
            <Info icon={Globe} label="Website" value="eloniot.com" link="https://eloniot.com" />
            <Info icon={Award} label="Operating Since" value="2019" />
            <Info icon={Users} label="GSTIN" value="Available on request" />
          </div>
          <p className="text-[11px] text-gray-500 mt-5 leading-relaxed">
            MemoraAI is a registered trademark of Eloniot Software Solutions. All software, content, and customer data are
            owned and operated by Eloniot Software Solutions, India.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center pb-12">
          <h3 className="text-2xl font-bold mb-3">Ready to put your WhatsApp on autopilot?</h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white text-sm font-semibold shadow-lg shadow-violet-600/30" data-testid="about-cta-register">
              Start Free Demo
            </Link>
            <a href="https://wa.me/916309356590?text=Hi%20MemoraAI%20team%2C%20I%20want%20a%20demo" target="_blank" rel="noreferrer"
              className="px-6 py-3 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Talk on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

function Value({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-violet-400" />
      </div>
      <h3 className="font-semibold text-white text-base mb-1.5">{title}</h3>
      <p className="text-[12px] text-gray-400 leading-relaxed">{text}</p>
    </div>
  );
}

function Info({ icon: Icon, label, value, link }) {
  const Wrap = link ? 'a' : 'div';
  const props = link ? { href: link, target: '_blank', rel: 'noreferrer' } : {};
  return (
    <Wrap {...props} className="flex items-start gap-2.5 group">
      <Icon className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">{label}</p>
        <p className={`text-sm font-medium ${link ? 'text-violet-300 group-hover:text-violet-200' : 'text-gray-200'}`}>{value}</p>
      </div>
    </Wrap>
  );
}

export default About;
