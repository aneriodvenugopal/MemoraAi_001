import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare, ArrowRight, Shield, Clock, Brain, Zap, Users, ChevronRight,
  Phone, CheckCircle, Star, BarChart3, Sparkles, Globe, Bot, Send,
  Calendar, Megaphone, TrendingUp, Heart, Building, Stethoscope,
  Scissors, GraduationCap, PartyPopper, Sprout, Code, ShoppingCart,
  Scale, Car, Dumbbell, Store, HardHat, Banknote, Utensils, Mic,
  Play, Check, X, Plus, Minus
} from 'lucide-react';
import MemoraLogo from '../../components/MemoraLogo';
import LeadCaptureSection from '../../components/LeadCaptureSection';

const API = process.env.REACT_APP_BACKEND_URL;
const WHATSAPP_NUMBER = "916309356590";

const ICON_MAP = {
  building: Building, stethoscope: Stethoscope, star: Star, scissors: Scissors,
  dumbbell: Dumbbell, car: Car, 'party-popper': PartyPopper, utensils: Utensils,
  'graduation-cap': GraduationCap, scale: Scale, banknote: Banknote,
  'shopping-cart': ShoppingCart, store: Store, 'hard-hat': HardHat,
  sprout: Sprout, code: Code,
};

function openWhatsApp(msg) {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

const Home = () => {
  const navigate = useNavigate();
  const [industries, setIndustries] = useState([]);
  const [visibleSections, setVisibleSections] = useState({});
  const observerRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/memoraai/industries/public`).then(r => r.json()).then(d => setIndustries(d.industries || [])).catch(() => {});
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setVisibleSections(p => ({ ...p, [e.target.id]: true }));
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('[data-animate]').forEach(el => observerRef.current.observe(el));
    return () => observerRef.current?.disconnect();
  }, [industries]);

  const anim = (id) => visibleSections[id] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8';

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white overflow-hidden" data-testid="home-page">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e27]/80 backdrop-blur-xl border-b border-white/5" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <MemoraLogo variant="compact" tone="dark" size="sm" to="/" />
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <Link to="/industries" className="hover:text-white transition-colors">Industries</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openWhatsApp("Hi, I want to see MemoraAI demo.")}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-semibold hover:bg-[#20bd5a] transition-all shadow-lg shadow-[#25D366]/20" data-testid="nav-whatsapp-btn">
              <MessageSquare className="w-4 h-4" /> Talk to MemoraAI
            </button>
            <button onClick={() => navigate('/register')}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-blue-700 transition-all shadow-lg shadow-violet-600/20" data-testid="nav-demo-btn">
              Start Free Demo
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-28 pb-20 md:pt-36 md:pb-28 px-4 relative" data-testid="hero-section">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px]" />
          <div className="absolute top-40 right-10 w-60 h-60 bg-[#25D366]/10 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" /> AI-Powered WhatsApp Automation
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Your WhatsApp Now <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-[#25D366]">Thinks, Remembers</span>
                <br/>& <span className="text-[#25D366]">Sells.</span>
              </h1>
              <p className="text-lg text-gray-400 max-w-xl mb-8 leading-relaxed">
                MemoraAI turns your WhatsApp into a memory-powered AI assistant that handles leads, follow-ups, bookings, support and repeat sales — automatically.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate('/register')}
                  className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-lg font-bold hover:from-violet-700 hover:to-blue-700 transition-all shadow-2xl shadow-violet-600/30 flex items-center justify-center gap-3" data-testid="hero-demo-btn">
                  Start Free Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#industries"
                  className="px-8 py-4 rounded-2xl border border-white/10 text-white text-lg font-semibold hover:bg-white/5 transition-all flex items-center justify-center gap-2 backdrop-blur-sm" data-testid="hero-industries-btn">
                  See Industry Demos
                </a>
              </div>
              {/* Counters */}
              <div className="flex gap-8 mt-10">
                {[
                  { value: "5,000+", label: "Leads Automated" },
                  { value: "92%", label: "Faster Replies" },
                  { value: "38%", label: "Higher Conversion" },
                ].map((c, i) => (
                  <div key={i}>
                    <p className="text-2xl font-bold text-white">{c.value}</p>
                    <p className="text-xs text-gray-500">{c.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* WhatsApp Mockup */}
            <div className="hidden lg:block">
              <WhatsAppMockup
                businessName="RealApex Properties"
                messages={[
                  { from: "customer", text: "Hi, I asked about plots last week." },
                  { from: "bot", text: "Welcome back Rajesh garu! You asked about 150 sq yd plots in Shadnagar. Two new options came today. Would you like details?" },
                  { from: "customer", text: "Yes, send details please." },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST SECTION ─── */}
      <section id="trust" className="py-16 px-4 border-t border-white/5" data-animate data-testid="trust-section">
        <div className={`max-w-6xl mx-auto transition-all duration-700 ${anim('trust')}`}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Shield, label: "Official WhatsApp API" },
              { icon: CheckCircle, label: "Verified Business Profile" },
              { icon: Brain, label: "Human-like Smart Replies" },
              { icon: Clock, label: "24/7 Auto Follow-up" },
              { icon: Globe, label: "Multi-language Support" },
              { icon: Users, label: "Lead Capture + CRM" },
            ].map((t, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/30 transition-all">
                <t.icon className="w-6 h-6 text-violet-400" />
                <span className="text-xs text-gray-400 text-center font-medium">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INDUSTRIES ─── */}
      <section id="industries" className="py-20 px-4" data-animate data-testid="industries-section">
        <div className={`max-w-7xl mx-auto transition-all duration-700 ${anim('industries')}`}>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">Every Business</span> That Uses WhatsApp</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Select your industry to see how MemoraAI transforms your customer communication.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {industries.slice(0, 12).map((ind, i) => {
              const Icon = ICON_MAP[ind.icon] || Star;
              return (
                <button key={ind.slug} onClick={() => navigate(`/industry/${ind.slug}`)}
                  className="group text-left p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all" data-testid={`industry-${ind.slug}`}>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mb-3 group-hover:from-violet-500/30 group-hover:to-blue-500/30 transition-all">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1.5">{ind.title}</h3>
                  {/* Service Tags */}
                  {ind.services && ind.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {ind.services.slice(0, 3).map((s, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/10">{s}</span>
                      ))}
                      {ind.services.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">+{ind.services.length - 3}</span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 mb-3 line-clamp-2">{ind.hero_sub?.slice(0, 90)}...</p>
                  <span className="text-[11px] text-violet-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Demo <ChevronRight className="w-3 h-3" />
                  </span>
                </button>
              );
            })}
          </div>
          {industries.length > 12 && (
            <div className="mt-8 flex justify-center sm:justify-end" data-testid="more-industries-cta">
              <Link
                to="/industries"
                className="group inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/30 text-white text-sm font-semibold hover:from-violet-600/30 hover:to-blue-600/30 hover:border-violet-400/50 transition-all backdrop-blur-sm"
              >
                Explore all {industries.length} industries
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-b from-transparent to-violet-950/20" data-animate data-testid="how-it-works">
        <div className={`max-w-4xl mx-auto transition-all duration-700 ${anim('how-it-works')}`}>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Get Started in <span className="text-[#25D366]">3 Simple Steps</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: MessageSquare, title: "Connect WhatsApp API", desc: "Link your official WhatsApp Business number. Takes 5 minutes." },
              { step: "2", icon: Brain, title: "Upload Business Info", desc: "Add your services, FAQs, and pricing. AI learns everything." },
              { step: "3", icon: Zap, title: "Start Selling", desc: "MemoraAI handles leads, bookings, and follow-ups automatically." },
            ].map((s, i) => (
              <div key={i} className="text-center group" data-testid={`step-${s.step}`}>
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-violet-600/30 group-hover:scale-110 transition-transform">
                  <s.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-xs text-violet-400 font-bold mb-2">STEP {s.step}</div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 px-4" data-animate data-testid="features-section">
        <div className={`max-w-6xl mx-auto transition-all duration-700 ${anim('features')}`}>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-[#25D366]">Win on WhatsApp</span></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: "Memory Engine", desc: "Remembers every customer detail — names, preferences, past requests, family info." },
              { icon: Heart, title: "Emotional AI Replies", desc: "Detects tone, urgency, and sentiment. Responds with empathy, not robotic scripts." },
              { icon: TrendingUp, title: "Lead Qualification", desc: "Auto-scores leads by buying intent, budget, and engagement level." },
              { icon: Clock, title: "Auto Follow-up", desc: "Never forget a lead. Smart follow-ups based on customer history and timing." },
              { icon: Calendar, title: "Appointment Booking", desc: "Customers book directly via WhatsApp. Auto-reminders before appointments." },
              { icon: Megaphone, title: "Smart Campaigns", desc: "Broadcast to segments based on behavior, not just contact lists." },
              { icon: Mic, title: "Voice + Text Support", desc: "Process voice messages and reply intelligently. Multilingual." },
              { icon: Users, title: "Multi-Agent Dashboard", desc: "Multiple staff members handle chats with unified customer memory." },
              { icon: BarChart3, title: "Analytics", desc: "Track conversion rates, response times, revenue per lead, and more." },
              { icon: Bot, title: "Self-Learning AI", desc: "Gets smarter with every conversation. Adapts to your business style." },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group" data-testid={`feature-${i}`}>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:from-violet-500/30 group-hover:to-blue-500/30 transition-all">
                  <f.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-transparent to-violet-950/20" data-animate data-testid="pricing-section">
        <div className={`max-w-5xl mx-auto transition-all duration-700 ${anim('pricing')}`}>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple, Transparent Pricing</h2>
            <p className="text-gray-500">Start free. Scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: "Starter", price: "Free", period: "14 days", features: ["100 messages/day", "1 agent", "Basic memory", "WhatsApp API", "Email support"], cta: "Start Free" },
              { name: "Growth", price: "Rs.2,999", period: "/month", features: ["1,000 messages/day", "3 agents", "Full memory engine", "Auto follow-ups", "Analytics dashboard"], cta: "Start Trial", popular: true },
              { name: "Premium", price: "Rs.7,999", period: "/month", features: ["Unlimited messages", "10 agents", "Custom AI persona", "API integrations", "Priority support"], cta: "Contact Sales" },
              { name: "Enterprise", price: "Custom", period: "", features: ["Multi-location", "Dedicated AI training", "Custom integrations", "SLA guarantee", "Account manager"], cta: "Book Call" },
            ].map((plan, i) => (
              <div key={i} className={`p-6 rounded-2xl border ${plan.popular ? 'bg-gradient-to-b from-violet-600/10 to-blue-600/10 border-violet-500/40 shadow-xl shadow-violet-600/10' : 'bg-white/[0.03] border-white/5'} relative`} data-testid={`plan-${plan.name.toLowerCase()}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full text-xs font-bold">Most Popular</div>}
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-[#25D366] flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${plan.popular ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 shadow-lg shadow-violet-600/20' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HUMANIZED CASE STORIES ─── */}
      <section id="stories" className="py-24 px-4 relative" data-testid="case-stories">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14" data-animate>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Real businesses, real results</span>
            <h2 className="text-3xl md:text-5xl font-extrabold mt-2 leading-tight">
              Meet the businesses that stopped<br/>missing <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">WhatsApp leads</span> at 9pm.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                name: "Ramesh Reddy",
                biz: "Sai Sri Plot Sales, Shankarpalli",
                cat: "Real Estate",
                quote: "We used to lose 40% of Sunday enquiries because nobody was in office. MemoraAI replies in 3 seconds — 17 site visits booked last week alone.",
                metric: "+212% site visits",
                color: "sky",
              },
              {
                name: "Dr. Priya Nair",
                biz: "SmileCare Dental, Kukatpally",
                cat: "Clinic",
                quote: "Patients message at midnight with photos of tooth pain. The AI books the right slot, pulls the X-ray reminder, even sends the Google Maps link. My receptionist got her mornings back.",
                metric: "0 missed bookings",
                color: "blue",
              },
              {
                name: "Kavitha Jyotish",
                biz: "Vedic Guidance, online",
                cat: "Astrology",
                quote: "I was drowning in horoscope requests. Now the AI asks birth details upfront, calculates the chart preview, and books a paid 30-min consult. Revenue doubled in 2 months.",
                metric: "2× revenue in 60 days",
                color: "indigo",
              },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm hover:border-sky-400/40 transition-colors" data-testid={`story-${i}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-${s.color}-400 to-${s.color}-600 flex items-center justify-center text-white font-bold`}>
                    {s.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{s.name}</p>
                    <p className="text-[11px] text-gray-400">{s.biz}</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">"{s.quote}"</p>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">{s.cat}</span>
                  <span className="text-xs font-bold text-green-400">{s.metric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LEAD CAPTURE (main conversion section) ─── */}
      <section id="demo" className="py-24 px-4 relative" data-testid="lead-section">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px]" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10 grid md:grid-cols-2 gap-10 items-center">
          <div data-animate>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Get Started</span>
            <h2 className="text-3xl md:text-5xl font-extrabold mt-2 leading-tight text-white">
              Book your<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400">free live demo</span>
            </h2>
            <p className="text-gray-400 text-base leading-relaxed mt-4">
              In 10 minutes, we'll show MemoraAI handling your exact customer questions — in English, Hindi, or Telugu. No slides. No theory. Your business, your scenarios.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Live WhatsApp demo with your industry's sample chats",
                "Pricing based on your team & message volume",
                "WABA setup walkthrough — go live same day",
                "Free onboarding & content upload support",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <LeadCaptureSection variant="compact" source="homepage" />
          </div>
        </div>
      </section>

      {/* ─── FAQ (SEO + trust) ─── */}
      <section id="faq" className="py-24 px-4" data-testid="faq-section">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10" data-animate>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">FAQ</span>
            <h2 className="text-3xl md:text-5xl font-extrabold mt-2">Questions, answered.</h2>
          </div>
          <FAQList items={[
            { q: "How quickly can MemoraAI go live for my business?", a: "30 minutes. After you connect your Meta WhatsApp Business API number and upload your brochures/price list, the AI starts replying. Most customers get their first live booking within 48 hours." },
            { q: "Do I need to change my WhatsApp number?", a: "No. MemoraAI runs on Meta's official WhatsApp Business API on top of your existing brand number. Your customers see exactly the same number they've always known." },
            { q: "Which industries are supported?", a: "16+ pre-built playbooks including Real Estate, Clinics, Astrology, Salons, Coaching centres, Function halls, Gyms, Auto dealers, Restaurants, Pesticides/Fertilisers, Agriculture, Retail, Construction, Legal/CA, and Financial advisors. Custom playbooks also available." },
            { q: "What languages does the AI speak?", a: "English, Hindi, and Telugu out of the box. Kannada, Tamil, Marathi, and more on request. The AI auto-detects the customer's language and replies in the same one." },
            { q: "What about my existing customer chats — are they lost?", a: "No. We import your WhatsApp history (last 6 months) into the RAG memory, so the AI already knows who asked about which plot, who came for which treatment, and follows up exactly where you left off." },
            { q: "Is my data safe?", a: "Yes. Every tenant has fully isolated data. WABA messages are stored with encryption at rest. We're ISO-compliant and never share data across businesses. Full data export available anytime." },
            { q: "What does it cost?", a: "Plans start at ₹999/month for small businesses with 1 user + 500 chats/month. Medium plan ₹2,499/month for 5 users + 3,000 chats. Enterprise pricing for multi-branch setups. Book a free demo to see pricing matched to your volume." },
            { q: "Can I try before I pay?", a: "Yes. All plans come with a free 7-day trial. No credit card required — we activate it after the live demo and onboarding call." },
          ]} />
        </div>
      </section>


      <section className="py-24 px-4 relative" data-testid="final-cta">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-[#25D366]/10 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Your Competitor <span className="text-gray-500">Replies.</span><br/>
            You <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-[#25D366]">Remember.</span>
          </h2>
          <p className="text-lg text-gray-400 mb-8">Start using MemoraAI today. Your customers will notice the difference.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/register')}
              className="group px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-lg font-bold hover:from-violet-700 hover:to-blue-700 transition-all shadow-2xl shadow-violet-600/30 flex items-center justify-center gap-3" data-testid="cta-demo-btn">
              Start Free Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => openWhatsApp("Hi, I want to book a MemoraAI setup call.")}
              className="px-10 py-4 rounded-2xl bg-[#25D366] text-white text-lg font-bold hover:bg-[#20bd5a] transition-all shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-3" data-testid="cta-call-btn">
              <Phone className="w-5 h-5" /> Book Setup Call
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 py-12 px-4" data-testid="footer">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-gray-500">
          <div>
            <div className="mb-3"><MemoraLogo variant="compact" tone="dark" size="sm" /></div>
            <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">WhatsApp That Remembers Every Customer.</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              A product by <a href="https://eloniot.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 font-semibold">Eloniot Software Solutions</a><br />
              <span className="text-gray-600">Hyderabad, India</span>
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">Product</h4>
            <ul className="space-y-2"><li><a href="#features" className="hover:text-white transition-colors">Features</a></li><li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li><li><Link to="/industries" className="hover:text-white transition-colors">Industries</Link></li><li><Link to="/register" className="hover:text-white transition-colors">Free Demo</Link></li></ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><a href="mailto:info@memoraai.in" className="hover:text-white transition-colors">info@memoraai.in</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/5 text-center text-xs text-gray-600 space-y-1">
          <p>© 2025-2026 <span className="text-gray-400 font-semibold">MemoraAI</span></p>
          <p>Owned & Operated by <a href="https://eloniot.com" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-violet-300 font-semibold">Eloniot Software Solutions</a> · Hyderabad, India · GSTIN available on request</p>
        </div>
      </footer>

      {/* ─── FLOATING WHATSAPP ─── */}
      <button onClick={() => openWhatsApp("Hi, I want to know about MemoraAI.")}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-2xl shadow-[#25D366]/30 hover:scale-110 transition-all" data-testid="floating-whatsapp">
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
};


/* ═══════════════ WhatsApp Mockup ═══════════════ */
export function WhatsAppMockup({ businessName, messages = [], compact = false }) {
  const [visibleMsgs, setVisibleMsgs] = useState([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!messages.length) return;
    let idx = 0;
    const show = () => {
      if (idx < messages.length) {
        const msg = messages[idx];
        if (msg.from === 'bot') {
          setTyping(true);
          setTimeout(() => {
            setTyping(false);
            setVisibleMsgs(p => [...p, msg]);
            idx++;
            setTimeout(show, 800);
          }, 1200);
        } else {
          setVisibleMsgs(p => [...p, msg]);
          idx++;
          setTimeout(show, 600);
        }
      }
    };
    const t = setTimeout(show, 500);
    return () => clearTimeout(t);
  }, []);

  const h = compact ? 'max-h-[340px]' : 'max-h-[420px]';

  return (
    <div className={`w-full max-w-[340px] mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-600/10 bg-[#0b1120]`} data-testid="whatsapp-mockup">
      {/* Header */}
      <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">{(businessName || 'B')[0]}</div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="text-white text-sm font-semibold">{businessName || 'Business'}</span>
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-[10px] text-green-200">online</span>
        </div>
      </div>
      {/* Chat */}
      <div className={`${h} overflow-y-auto p-3 space-y-2`} style={{ background: "url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect width=\"20\" height=\"20\" fill=\"%230b1120\"/%3E%3Ccircle cx=\"10\" cy=\"10\" r=\"0.5\" fill=\"%23ffffff08\"/%3E%3C/svg%3E')" }}>
        {visibleMsgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.from === 'customer' ? 'bg-[#005C4B] text-white rounded-br-sm' : 'bg-[#1a2236] text-gray-200 rounded-bl-sm border border-white/5'}`}>
              {m.text}
              <div className="text-[9px] text-gray-500 text-right mt-1">{new Date().getHours()}:{String(new Date().getMinutes()).padStart(2,'0')}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-[#1a2236] border border-white/5 px-4 py-2.5 rounded-2xl rounded-bl-sm flex gap-1">
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;

/* ─── FAQ Accordion ─── */
export function FAQList({ items = [] }) {
  const [open, setOpen] = React.useState(0);
  return (
    <div className="space-y-2" data-testid="faq-list">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className={`border rounded-2xl overflow-hidden transition-all ${isOpen ? 'border-sky-400/50 bg-sky-500/5' : 'border-white/10 bg-white/5'}`} data-testid={`faq-item-${i}`}>
            <button onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left" data-testid={`faq-toggle-${i}`}>
              <span className="font-semibold text-white text-sm sm:text-base pr-4">{it.q}</span>
              {isOpen ? <Minus className="w-5 h-5 text-sky-400 flex-shrink-0" /> : <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />}
            </button>
            {isOpen && (
              <div className="px-5 pb-4 text-sm text-gray-300 leading-relaxed" data-testid={`faq-answer-${i}`}>{it.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
