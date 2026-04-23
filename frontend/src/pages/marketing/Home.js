import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowRight, Star, Stethoscope, PartyPopper, Sprout, Scissors, GraduationCap, Building, Phone, CheckCircle, Zap, Brain, Shield, Clock, Users, ChevronRight, Send, Sparkles, Globe } from 'lucide-react';
import MemoraAILogo from '../../components/MemoraAILogo';

const WHATSAPP_NUMBER = "916309356590";

const CATEGORIES = [
  { slug: "real_estate", name: "Real Estate", icon: Building, color: "bg-blue-500", msg: "Hi, I am interested in Real Estate services. Please share details.", desc: "Property sales, site visits, plot management" },
  { slug: "astrology", name: "Astrology", icon: Star, color: "bg-purple-500", msg: "Hi, I am interested in Astrology consultation services.", desc: "Horoscope, Kundli, marriage matching" },
  { slug: "doctor_clinic", name: "Doctor / Clinic", icon: Stethoscope, color: "bg-emerald-500", msg: "Hi, I want to book a Doctor consultation.", desc: "Appointments, checkups, lab tests" },
  { slug: "function_hall", name: "Function Hall", icon: PartyPopper, color: "bg-amber-500", msg: "Hi, I want to book a Function Hall for an event.", desc: "Weddings, parties, corporate events" },
  { slug: "pesticides", name: "Pesticides / Fertilizer", icon: Sprout, color: "bg-lime-600", msg: "Hi, I need Pesticides and Fertilizer for my crops.", desc: "Crop protection, soil testing, B2B2C" },
  { slug: "beauty_salon", name: "Beauty Salon", icon: Scissors, color: "bg-pink-500", msg: "Hi, I want to book a Beauty Salon appointment.", desc: "Haircut, facial, bridal makeup" },
  { slug: "coaching", name: "Coaching Centers", icon: GraduationCap, color: "bg-indigo-500", msg: "Hi, I am interested in Coaching classes. Please share details.", desc: "Entrance exams, tuitions, skill courses" },
];

const FEATURES = [
  { icon: Brain, title: "AI Memory Engine", desc: "Remembers every customer interaction. Personalized responses using RAG-based long-term memory." },
  { icon: MessageSquare, title: "WhatsApp Automation", desc: "24/7 intelligent WhatsApp chatbot. Auto-replies, follow-ups, and lead capture." },
  { icon: Zap, title: "Hot Sales Detection", desc: "AI detects buying intent in real-time. Instant alerts when a customer is ready to convert." },
  { icon: Shield, title: "Self-Service WABA", desc: "Set up your WhatsApp Business API yourself. No developer needed." },
  { icon: Clock, title: "Smart Scheduling", desc: "Appointment booking and reminders via WhatsApp. Category-specific workflows." },
  { icon: Users, title: "Multi-Tenant SaaS", desc: "Each business gets isolated data, custom branding, and category-specific AI." },
];

function openWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

const Home = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-white" data-testid="home-page">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-sm" data-testid="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0">
            <MemoraAILogo size="sm" showCaption={true} showBrand={true} />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#industries" className="text-sm text-gray-600 hover:text-amber-600 font-medium">Industries</a>
            <a href="#features" className="text-sm text-gray-600 hover:text-amber-600 font-medium">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-amber-600 font-medium">How It Works</a>
            <Link to="/login" className="text-sm text-amber-700 font-semibold hover:text-amber-800">Login</Link>
            <button onClick={() => openWhatsApp("Hi, I want to know about MemoraAI WhatsApp Automation.")}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:from-amber-600 hover:to-yellow-600 shadow-md hover:shadow-lg transition-all flex items-center gap-2" data-testid="nav-whatsapp-btn">
              <MessageSquare className="w-4 h-4" /> Connect on WhatsApp
            </button>
          </div>
          <button onClick={() => openWhatsApp("Hi, I want to know about MemoraAI.")}
            className="md:hidden bg-amber-500 text-white p-2 rounded-full" data-testid="mobile-whatsapp-btn">
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-4" data-testid="hero-section">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> AI-Powered WhatsApp Automation for Every Business
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Turn WhatsApp Into Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-yellow-500"> Smartest Sales Agent</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            MemoraAI remembers every customer, automates follow-ups, books appointments, and closes deals — all through WhatsApp. For any business category.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => openWhatsApp("Hi, I want to try MemoraAI for my business.")}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3" data-testid="hero-whatsapp-btn">
              <MessageSquare className="w-6 h-6" /> Start Chatting on WhatsApp
            </button>
            <button onClick={() => navigate('/register')}
              className="border-2 border-amber-500 text-amber-700 px-8 py-4 rounded-full text-lg font-bold hover:bg-amber-50 transition-all flex items-center justify-center gap-2" data-testid="hero-register-btn">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Supported Industries */}
      <section id="industries" className="py-16 px-4 bg-white" data-testid="industries-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Supported Industries</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Select your business category. MemoraAI adapts its AI, services, and templates for your industry.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.slug;
              return (
                <div key={cat.slug}
                  className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-xl group ${isSelected ? 'border-amber-500 bg-amber-50 shadow-lg' : 'border-gray-100 bg-white hover:border-amber-200'}`}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.slug)}
                  data-testid={`industry-card-${cat.slug}`}>
                  <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center mb-3 shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{cat.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{cat.desc}</p>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openWhatsApp(cat.msg); }}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors" data-testid={`whatsapp-${cat.slug}`}>
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); openWhatsApp(`Hi, small enquiry about ${cat.name} services.`); }}
                      className="flex-1 border border-gray-200 hover:border-amber-400 text-gray-600 hover:text-amber-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors" data-testid={`enquiry-${cat.slug}`}>
                      <Send className="w-3 h-3" /> Quick Enquiry
                    </button>
                  </div>
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4 bg-gradient-to-b from-amber-50 to-white" data-testid="features-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Why MemoraAI?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Enterprise-grade WhatsApp automation with AI memory. Built for Indian businesses.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all" data-testid={`feature-card-${i}`}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center mb-4 shadow-md">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4 bg-white" data-testid="how-it-works-section">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Get Started in 3 Steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Choose Your Category", desc: "Select your business type. AI auto-configures services, templates, and responses." },
              { step: "2", title: "Connect WhatsApp", desc: "Self-service WABA setup. Enter your token and phone number. We handle the rest." },
              { step: "3", title: "Start Selling", desc: "AI handles leads, bookings, follow-ups. You focus on your business." },
            ].map((s, i) => (
              <div key={i} className="text-center" data-testid={`step-${s.step}`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Business Pages */}
      <section className="py-16 px-4 bg-gradient-to-b from-amber-50 to-yellow-50" data-testid="business-pages-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Related Business Pages</h2>
            <p className="text-gray-500">Explore MemoraAI solutions by industry</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <div key={cat.slug}
                  onClick={() => openWhatsApp(cat.msg)}
                  className="bg-white rounded-xl p-4 border border-gray-100 hover:border-amber-300 hover:shadow-md cursor-pointer transition-all group" data-testid={`biz-page-${cat.slug}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">{cat.name}</h4>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{cat.desc}</p>
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Connect on WhatsApp <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" data-testid="cta-section">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ready to Automate Your Business?</h2>
          <p className="text-gray-500 mb-8 text-lg">Join hundreds of businesses using MemoraAI to grow through WhatsApp.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => openWhatsApp("Hi, I want to start using MemoraAI for my business.")}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-10 py-4 rounded-full text-lg font-bold hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3" data-testid="cta-whatsapp-btn">
              <MessageSquare className="w-6 h-6" /> Connect with WhatsApp
            </button>
            <button onClick={() => navigate('/register')}
              className="border-2 border-amber-500 text-amber-700 px-10 py-4 rounded-full text-lg font-bold hover:bg-amber-50 transition-all" data-testid="cta-trial-btn">
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4" data-testid="footer">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <MemoraAILogo size="md" showCaption={true} showBrand={true} className="brightness-0 invert mb-3" />
              <p className="text-gray-400 text-sm">AI-powered WhatsApp Business Automation for every industry. Built by Eloniot Software Solutions.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-amber-400">Industries</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {CATEGORIES.slice(0, 4).map(c => <li key={c.slug} className="hover:text-white cursor-pointer" onClick={() => openWhatsApp(c.msg)}>{c.name}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-amber-400">More Industries</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {CATEGORIES.slice(4).map(c => <li key={c.slug} className="hover:text-white cursor-pointer" onClick={() => openWhatsApp(c.msg)}>{c.name}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-amber-400">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
                <li><Link to="/register" className="hover:text-white">Register</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/terms-conditions" className="hover:text-white">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>2025-2026 MemoraAI by Eloniot Software Solutions. All rights reserved.</p>
            <p className="flex items-center gap-1 mt-2 md:mt-0">
              <Globe className="w-3 h-3" /> Powered by MemoraAI
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <button onClick={() => openWhatsApp("Hi, I want to know about MemoraAI.")}
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all animate-bounce" data-testid="floating-whatsapp" style={{animationDuration: '3s'}}>
        <MessageSquare className="w-7 h-7" />
      </button>
    </div>
  );
};

export default Home;
