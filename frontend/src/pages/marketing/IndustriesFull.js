import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, ChevronRight, MessageSquare, Sparkles, Brain,
  Building, Stethoscope, Star, Scissors, Dumbbell, Car, PartyPopper,
  Utensils, GraduationCap, Scale, Banknote, ShoppingCart, Store,
  HardHat, Sprout, Code, Repeat
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICON_MAP = {
  building: Building, stethoscope: Stethoscope, star: Star, scissors: Scissors,
  dumbbell: Dumbbell, car: Car, "party-popper": PartyPopper, utensils: Utensils,
  "graduation-cap": GraduationCap, scale: Scale, banknote: Banknote,
  "shopping-cart": ShoppingCart, store: Store, "hard-hat": HardHat,
  sprout: Sprout, code: Code, repeat: Repeat,
};

export default function IndustriesFull() {
  const navigate = useNavigate();
  const [industries, setIndustries] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "All Industries — MemoraAI";
    fetch(`${API}/memoraai/industries/public`)
      .then(r => r.json())
      .then(d => setIndustries(d.industries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return industries;
    return industries.filter(i =>
      (i.title || "").toLowerCase().includes(needle) ||
      (i.hero_sub || "").toLowerCase().includes(needle) ||
      (i.services || []).join(" ").toLowerCase().includes(needle)
    );
  }, [industries, q]);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white" data-testid="industries-page">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a1a]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-4">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-white/5" data-testid="back-home">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
              All <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">Industries</span> We Power
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500">
              {loading ? "Loading..." : `${industries.length} WhatsApp playbooks, demos, and case studies`}
            </p>
          </div>
          <Link to="/register" className="hidden sm:inline-flex items-center gap-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-xl" data-testid="cta-register-top">
            <Sparkles className="w-3.5 h-3.5" /> Try Free
          </Link>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by industry, service or keyword (e.g. 'bridal', 'loan', 'gym')..."
            className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05]"
            data-testid="industries-search"
          />
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="py-20 text-center text-gray-500">Loading industries...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 font-semibold">No industry matches "{q}"</p>
            <p className="text-[11px] text-gray-500 mt-1">Try a different keyword or <button onClick={() => setQ("")} className="text-violet-400 underline">clear search</button></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="industries-full-grid">
            {filtered.map((ind) => {
              const Icon = ICON_MAP[ind.icon] || Sparkles;
              const lastBot = (ind.demo_chat || []).filter(m => m.from === "bot").slice(-1)[0];
              return (
                <Link
                  key={ind.slug}
                  to={`/industry/${ind.slug}`}
                  className="group flex flex-col p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
                  data-testid={`industry-card-${ind.slug}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-violet-500/30 group-hover:to-blue-500/30">
                      <Icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white text-sm leading-tight">{ind.title}</h3>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{ind.hero_sub?.slice(0, 75)}...</p>
                    </div>
                  </div>

                  {/* Services chips */}
                  {ind.services && ind.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {ind.services.slice(0, 4).map((s, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/10">{s}</span>
                      ))}
                      {ind.services.length > 4 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">+{ind.services.length - 4}</span>}
                    </div>
                  )}

                  {/* Sneak peek from demo chat */}
                  {lastBot && (
                    <div className="mt-auto mb-3 rounded-xl bg-white/[0.02] border border-white/5 p-3">
                      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-violet-400 font-bold mb-1">
                        <Brain className="w-2.5 h-2.5" /> AI Demo
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed line-clamp-3 italic">
                        "{lastBot.text.slice(0, 120)}{lastBot.text.length > 120 ? "…" : ""}"
                      </p>
                    </div>
                  )}

                  <span className="flex items-center gap-1 text-[11px] text-violet-400 font-medium group-hover:gap-2 transition-all">
                    <MessageSquare className="w-3 h-3" /> View Full Demo Chat <ChevronRight className="w-3 h-3 ml-auto" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Request-new-industry CTA */}
        <div className="mt-12 p-6 rounded-3xl bg-gradient-to-br from-violet-600/10 to-blue-600/10 border border-violet-500/20 text-center" data-testid="suggest-industry">
          <h3 className="text-lg font-bold mb-1">Don't see your industry?</h3>
          <p className="text-sm text-gray-400 max-w-lg mx-auto mb-4">
            MemoraAI can be customised for any WhatsApp-led business. Tell us yours and we'll build a playbook within 48 hours.
          </p>
          <a href="https://wa.me/916309356590?text=I%20want%20MemoraAI%20for%20my%20industry%3A" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#25D366] to-[#1ebc56] hover:from-[#1ebc56] hover:to-[#25D366] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-green-500/20"
            data-testid="whatsapp-suggest-btn">
            <MessageSquare className="w-4 h-4" /> Suggest an Industry on WhatsApp
          </a>
        </div>
      </main>
    </div>
  );
}
