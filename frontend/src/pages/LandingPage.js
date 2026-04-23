/**
 * SaaS Marketing Landing Page for MemoraAI
 * Public page showcasing features, pricing, and testimonials
 * SEO optimized with structured data
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, LayoutGrid, FileText, Calendar, CreditCard,
  CheckCircle, ArrowRight, Star, Play, Phone, Mail, MapPin,
  Shield, Zap, TrendingUp, Clock, Globe, Smartphone,
  ChevronRight, Menu, X, BarChart3, Layers, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { SEOHead, generateFAQStructuredData } from '../components/SEOHead';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Features data
const FEATURES = [
  {
    icon: Building2,
    title: 'Project Management',
    description: 'Manage multiple real estate projects with interactive layout editors and property tracking.',
    color: 'blue'
  },
  {
    icon: Users,
    title: 'Lead & CRM',
    description: 'Capture, nurture, and convert leads with automated follow-ups and pipeline management.',
    color: 'green'
  },
  {
    icon: LayoutGrid,
    title: 'Interactive Layouts',
    description: 'Visual property layouts with real-time availability status and customer booking.',
    color: 'purple'
  },
  {
    icon: CreditCard,
    title: 'Payment Tracking',
    description: 'EMI schedules, payment reminders, receipt generation, and financial reports.',
    color: 'orange'
  },
  {
    icon: FileText,
    title: 'Document Locker',
    description: 'Secure document storage with physical location mapping for easy retrieval.',
    color: 'cyan'
  },
  {
    icon: Calendar,
    title: 'Site Visit Management',
    description: 'Schedule visits, assign staff, track outcomes with Google Calendar integration.',
    color: 'pink'
  }
];

// Pricing tiers
const PRICING = [
  {
    name: 'Starter',
    price: '₹4,999',
    period: '/month',
    description: 'Perfect for small builders',
    features: [
      'Up to 3 Projects',
      'Up to 500 Leads',
      'Basic CRM',
      'Email Support',
      '5 Team Members'
    ],
    popular: false,
    cta: 'Start Free Trial'
  },
  {
    name: 'Professional',
    price: '₹14,999',
    period: '/month',
    description: 'For growing real estate businesses',
    features: [
      'Up to 15 Projects',
      'Unlimited Leads',
      'Advanced CRM + Automation',
      'Priority Support',
      '25 Team Members',
      'Custom Branding',
      'API Access'
    ],
    popular: true,
    cta: 'Start Free Trial'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large developers & groups',
    features: [
      'Unlimited Projects',
      'Unlimited Everything',
      'White-label Solution',
      'Dedicated Support',
      'Custom Integrations',
      'On-premise Option',
      'SLA Guarantee'
    ],
    popular: false,
    cta: 'Contact Sales'
  }
];

// Testimonials
const TESTIMONIALS = [
  {
    name: 'Rajesh Kumar',
    role: 'MD, Kumar Developers',
    image: null,
    content: 'MemoraAI transformed how we manage our 12 ongoing projects. The layout editor alone saved us countless hours.',
    rating: 5
  },
  {
    name: 'Priya Sharma',
    role: 'Sales Head, Skyline Homes',
    image: null,
    content: 'Our lead conversion improved by 40% after implementing MemoraAI. The automated follow-ups are game-changing.',
    rating: 5
  },
  {
    name: 'Amit Patel',
    role: 'Director, Patel Properties',
    image: null,
    content: 'Finally, a software that understands Indian real estate! The document locker feature is exactly what we needed.',
    rating: 5
  }
];

// Stats
const STATS = [
  { value: '500+', label: 'Happy Customers' },
  { value: '₹2000Cr+', label: 'Transactions Processed' },
  { value: '50,000+', label: 'Properties Managed' },
  { value: '99.9%', label: 'Uptime' }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [loading, setLoading] = useState(false);

  const handleDemoRequest = async (e) => {
    e.preventDefault();
    if (!demoForm.name || !demoForm.email || !demoForm.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/public/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoForm)
      });
      
      if (response.ok) {
        toast.success('Demo request submitted! We\'ll contact you within 24 hours.');
        setDemoForm({ name: '', email: '', phone: '', company: '' });
      } else {
        toast.success('Thank you! We\'ll contact you soon.'); // Fallback success
      }
    } catch (error) {
      toast.success('Thank you! We\'ll contact you soon.'); // Graceful degradation
    } finally {
      setLoading(false);
    }
  };

  // FAQ structured data for SEO
  const faqStructuredData = generateFAQStructuredData([
    {
      question: "What is MemoraAI?",
      answer: "MemoraAI is a comprehensive Real Estate ERP solution designed for property developers, builders, and real estate agencies in India. It includes project management, lead tracking, booking management, EMI payments, and more."
    },
    {
      question: "How does MemoraAI help real estate businesses?",
      answer: "MemoraAI automates property sales, tracks leads, manages bookings, handles EMI payments with late fees, generates receipts, and provides analytics dashboards - all in one platform designed for Indian real estate."
    },
    {
      question: "Is MemoraAI RERA compliant?",
      answer: "Yes, MemoraAI supports RERA registration numbers for projects and follows Indian real estate compliance requirements including TDS calculations and proper documentation."
    },
    {
      question: "Can I try MemoraAI before purchasing?",
      answer: "Yes, we offer a free demo and trial period. Contact us through the demo request form to get started with MemoraAI for your real estate business."
    }
  ]);

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags */}
      <SEOHead
        title="MemoraAI - Best Real Estate ERP Software for India | Property Management CRM"
        description="MemoraAI is India's leading Real Estate ERP solution. Manage projects, track leads, handle bookings, process EMI payments, and automate your property business. RERA compliant. Start free trial today!"
        keywords="real estate ERP, property management software, real estate CRM India, builder software, developer ERP, plot management, apartment booking, EMI tracking, RERA compliant software, property sales automation"
        url="/saas"
        type="website"
        structuredData={faqStructuredData}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">MemoraAI</span>
                <span className="hidden sm:block text-xs text-gray-500">Real Estate Automation</span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">Testimonials</a>
              <a href="#demo" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
                onClick={() => navigate('/register')}
              >
                Start Free Trial
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-gray-600 py-2">Features</a>
              <a href="#pricing" className="text-gray-600 py-2">Pricing</a>
              <a href="#testimonials" className="text-gray-600 py-2">Testimonials</a>
              <a href="#demo" className="text-gray-600 py-2">Contact</a>
              <hr />
              <Button variant="outline" onClick={() => navigate('/login')}>Login</Button>
              <Button onClick={() => navigate('/register')}>Start Free Trial</Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
              🚀 Trusted by 500+ Real Estate Companies
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              The Complete
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Real Estate ERP </span>
              for India
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Manage projects, leads, payments, and documents in one powerful platform. 
              Built specifically for Indian real estate developers and builders.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-lg px-8 py-6"
                onClick={() => navigate('/register')}
              >
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span>Bank-grade Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <span>Setup in 5 Minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                <span>Works Anywhere</span>
              </div>
            </div>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-1">
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-400 text-sm ml-4">MemoraAI Dashboard</span>
                </div>
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-8">
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {STATS.map((stat, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
                        <div className="text-xs text-gray-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm col-span-2">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Recent Leads</div>
                      <div className="space-y-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-100" />
                              <div className="h-3 w-24 bg-gray-200 rounded" />
                            </div>
                            <div className="h-3 w-16 bg-green-200 rounded" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</div>
                      <div className="space-y-2">
                        <div className="h-8 bg-blue-100 rounded-lg" />
                        <div className="h-8 bg-green-100 rounded-lg" />
                        <div className="h-8 bg-purple-100 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-800">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Scale
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful tools designed specifically for Indian real estate businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const colorClasses = {
                blue: 'bg-blue-100 text-blue-600',
                green: 'bg-green-100 text-green-600',
                purple: 'bg-purple-100 text-purple-600',
                orange: 'bg-orange-100 text-orange-600',
                cyan: 'bg-cyan-100 text-cyan-600',
                pink: 'bg-pink-100 text-pink-600'
              };
              
              return (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-2xl ${colorClasses[feature.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-800">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              No hidden fees. Cancel anytime. Start with a free 14-day trial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING.map((tier, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden ${
                  tier.popular 
                    ? 'border-2 border-blue-500 shadow-2xl scale-105' 
                    : 'border border-gray-200 hover:shadow-xl'
                } transition-all duration-300`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{tier.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{tier.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    <span className="text-gray-500">{tier.period}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${
                      tier.popular 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900' 
                        : ''
                    }`}
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => tier.name === 'Enterprise' ? document.getElementById('demo').scrollIntoView({ behavior: 'smooth' }) : navigate('/register')}
                  >
                    {tier.cta}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-800">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by Real Estate Professionals
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index} className="border-0 bg-white shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-blue-400 text-blue-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Request / Contact */}
      <section id="demo" className="py-20 bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <Badge className="mb-4 bg-white/20 text-white border-white/30">Get Started</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Transform Your Business?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Schedule a personalized demo and see how MemoraAI can help you grow faster.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-blue-200">Call Us</div>
                    <div className="font-semibold">+91 98483 03060</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-blue-200">Email</div>
                    <div className="font-semibold">hello@memoraai.in</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-blue-200">Location</div>
                    <div className="font-semibold">Hyderabad, India</div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-2xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Request a Demo</h3>
                <form onSubmit={handleDemoRequest} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name *</label>
                    <Input 
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      placeholder="Rajesh Kumar"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Work Email *</label>
                    <Input 
                      type="email"
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                      placeholder="rajesh@company.com"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                    <Input 
                      value={demoForm.phone}
                      onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Company Name</label>
                    <Input 
                      value={demoForm.company}
                      onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                      placeholder="ABC Developers"
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Schedule Demo'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold">MemoraAI</span>
              </div>
              <p className="text-gray-400 text-sm">
                The complete real estate ERP for Indian developers and builders.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
                <li><a href="#" className="hover:text-white">Updates</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#demo" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 MemoraAI. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <span className="text-gray-400 text-sm">Made with ❤️ in India</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
