import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Brain, ArrowRight, ArrowLeft, Building, Star, Stethoscope, Scissors,
  GraduationCap, PartyPopper, Sprout, CheckCircle, User, Phone, Mail,
  Lock, MapPin, MessageSquare, Eye, EyeOff
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { slug: "real_estate", name: "Real Estate", icon: Building, color: "from-blue-500 to-blue-600" },
  { slug: "doctor_clinic", name: "Hospital / Clinic", icon: Stethoscope, color: "from-emerald-500 to-emerald-600" },
  { slug: "astrology", name: "Astrology", icon: Star, color: "from-purple-500 to-purple-600" },
  { slug: "beauty_salon", name: "Beauty Salon", icon: Scissors, color: "from-pink-500 to-pink-600" },
  { slug: "function_hall", name: "Function Hall", icon: PartyPopper, color: "from-amber-500 to-amber-600" },
  { slug: "coaching_center", name: "Coaching Center", icon: GraduationCap, color: "from-indigo-500 to-indigo-600" },
  { slug: "pesticides_fertilizer", name: "Agriculture / Pesticides", icon: Sprout, color: "from-lime-500 to-lime-600" },
];

export default function Register() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "", company_name: "",
    category: "", city: "",
  });

  const updateForm = (key, val) => { setForm(f => ({ ...f, [key]: val })); setError(""); };

  const validateStep1 = () => {
    if (!form.name.trim()) return "Business owner name is required";
    if (!form.phone.trim() || form.phone.length < 10) return "Valid 10-digit mobile number required";
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const validateStep2 = () => {
    if (!form.company_name.trim()) return "Business name is required";
    if (!form.category) return "Select your business category";
    return null;
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.errors?.join(", ") || "Registration failed");
        setLoading(false);
        return;
      }
      // Auto-login with returned token
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/dashboard";
      } else {
        navigate("/login");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white flex items-center justify-center p-4" data-testid="register-page">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Memora<span className="text-violet-400">AI</span></span>
          </Link>
          <p className="text-gray-400 text-sm">Set up your WhatsApp Business Automation in 2 minutes</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8" data-testid="progress-steps">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-violet-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-[10px] text-gray-500 mb-6 px-4">
          <span className={step === 1 ? "text-violet-400 font-medium" : ""}>Your Details</span>
          <span className={step === 2 ? "text-violet-400 font-medium" : ""}>Business Info</span>
          <span className={step === 3 ? "text-violet-400 font-medium" : ""}>Confirm</span>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          {/* Step 1: Personal Details */}
          {step === 1 && (
            <div className="space-y-4" data-testid="step-1">
              <h2 className="text-xl font-bold mb-1">Your Details</h2>
              <p className="text-sm text-gray-500 mb-4">Let's get you started with MemoraAI</p>

              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  placeholder="Full Name *" value={form.name} onChange={e => updateForm("name", e.target.value)} data-testid="reg-name" />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  placeholder="Mobile Number (10 digits) *" maxLength={10} value={form.phone} onChange={e => updateForm("phone", e.target.value.replace(/\D/g, ""))} data-testid="reg-phone" />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input type="email" className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  placeholder="Email (optional)" value={form.email} onChange={e => updateForm("email", e.target.value)} data-testid="reg-email" />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input type={showPwd ? "text" : "password"} className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  placeholder="Password (min 6 chars) *" value={form.password} onChange={e => updateForm("password", e.target.value)} data-testid="reg-password" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3 text-gray-500">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button onClick={() => { const err = validateStep1(); if (err) { setError(err); } else { setStep(2); } }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm hover:from-violet-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2" data-testid="next-step-1">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Business Details */}
          {step === 2 && (
            <div className="space-y-4" data-testid="step-2">
              <h2 className="text-xl font-bold mb-1">Business Information</h2>
              <p className="text-sm text-gray-500 mb-4">Tell us about your business</p>

              <div className="relative">
                <Building className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  placeholder="Business Name *" value={form.company_name} onChange={e => updateForm("company_name", e.target.value)} data-testid="reg-company" />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  placeholder="City" value={form.city} onChange={e => updateForm("city", e.target.value)} data-testid="reg-city" />
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-3">Select your business category *</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const selected = form.category === cat.slug;
                    return (
                      <button key={cat.slug} type="button" onClick={() => updateForm("category", cat.slug)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${selected ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`} data-testid={`cat-${cat.slug}`}>
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-medium">{cat.name}</span>
                        {selected && <CheckCircle className="w-4 h-4 text-violet-400 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 flex items-center justify-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => { const err = validateStep2(); if (err) { setError(err); } else { setStep(3); } }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2" data-testid="next-step-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4" data-testid="step-3">
              <h2 className="text-xl font-bold mb-1">Confirm & Start</h2>
              <p className="text-sm text-gray-500 mb-4">Review your details</p>

              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <Row label="Name" value={form.name} />
                <Row label="Mobile" value={form.phone} />
                {form.email && <Row label="Email" value={form.email} />}
                <Row label="Business" value={form.company_name} />
                {form.city && <Row label="City" value={form.city} />}
                <Row label="Category" value={CATEGORIES.find(c => c.slug === form.category)?.name || form.category} />
              </div>

              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-sm">
                <p className="font-semibold text-violet-300 mb-1">What happens next?</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>1. Your account is created instantly</li>
                  <li>2. AI-suggested services loaded for your category</li>
                  <li>3. Connect your WhatsApp Business API</li>
                  <li>4. Start automating customer conversations!</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 flex items-center justify-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleRegister} disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-sm hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20" data-testid="register-submit">
                  {loading ? "Creating..." : "Start Free Demo"} {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-xs mt-3 text-center" data-testid="error-msg">{error}</p>}
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Already have an account? <Link to="/login" className="text-violet-400 hover:text-violet-300">Login</Link>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}
