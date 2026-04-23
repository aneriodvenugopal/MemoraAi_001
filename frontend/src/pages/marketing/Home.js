import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Building2, MapPin, ArrowRight, Building, CheckCircle, Layers } from 'lucide-react';
import ChatWidget from '../../components/ChatWidget';
import ChatbotWidget from '../../components/ChatbotWidget';
import HeroCarousel from '../../components/HeroCarousel';
import AppInstallBanner from '../../components/AppInstallBanner';
import StickyNavbar from '../../components/StickyNavbar';
import FloatingWhatsApp from '../../components/FloatingWhatsApp';
import SuccessStories from '../../components/SuccessStories';
import ROICalculator from '../../components/ROICalculator';
import WhoBenefits from '../../components/WhoBenefits';
import FeatureHighlights from '../../components/FeatureHighlights';
import TestimonialsCarousel from '../../components/TestimonialsCarousel';
import ImplementationSupport from '../../components/ImplementationSupport';
import OurStoryImproved from '../../components/OurStoryImproved';
import EloniotCredibility from '../../components/EloniotCredibility';
import IncomeLandsSuccess from '../../components/IncomeLandsSuccess';
import { usePageTranslation } from '../../hooks/usePageTranslation';
import apiInstance from '../../services/api';

const Home = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');
  const [featuredTenants, setFeaturedTenants] = useState([]);
  const [availableLayouts, setAvailableLayouts] = useState([]);

  // Fetch featured tenants and layouts on component mount
  useEffect(() => {
    fetchFeaturedTenants();
    fetchAvailableLayouts();
  }, []);

  const fetchFeaturedTenants = async () => {
    try {
      const response = await apiInstance.get('/public/tenants?limit=6');
      if (response.data.success) {
        setFeaturedTenants(response.data.tenants);
      }
    } catch (error) {
      console.error('Failed to load featured tenants:', error);
    }
  };

  const fetchAvailableLayouts = async () => {
    try {
      const response = await apiInstance.get('/public/layouts?limit=12');
      if (response.data.success) {
        setAvailableLayouts(response.data.layouts);
      }
    } catch (error) {
      console.error('Failed to load layouts:', error);
    }
  };

  // Translation content
  const t = usePageTranslation({
    hero_title: "Real Estate",
    hero_subtitle: "40X Faster",
    hero_description: "Streamline your real estate business with our comprehensive ERP solution. Manage leads, properties, payments, and teams all in one place.",
    get_started: "Get Started Free",
    learn_more: "Learn More",
    trusted_by: "Trusted by 500+ Real Estate Professionals",
    features_title: "Everything You Need to Grow Your Real Estate Business",
    features_subtitle: "Powerful features designed for modern real estate professionals",
    // Features
    lead_management: "Lead Management",
    lead_desc: "Never lose a lead. Capture, track, and convert with intelligent workflows.",
    property_management: "Property Management",
    property_desc: "Manage unlimited properties with interactive layouts and virtual tours.",
    payment_tracking: "Payment Tracking",
    payment_desc: "Automated payment tracking, invoicing, and commission calculations.",
    team_collaboration: "Team Collaboration",
    team_desc: "Role-based access, task management, and real-time notifications.",
    analytics: "Analytics & Reports",
    analytics_desc: "Comprehensive insights into your business performance.",
    mobile_app: "Mobile App",
    mobile_desc: "Manage your business on-the-go with our PWA mobile app.",
    // Stats
    stat_properties: "Properties Managed",
    stat_leads: "Leads Tracked",
    stat_revenue: "Revenue Processed",
    stat_clients: "Happy Clients",
    // CTA
    cta_title: "Ready to Transform Your Real Estate Business?",
    cta_subtitle: "Join thousands of real estate professionals using RealApex",
    cta_button: "Start Your Free Trial",
    // Footer
    footer_subscribe: "Subscribe to our newsletter",
    footer_email_placeholder: "Enter your email",
    footer_subscribe_button: "Subscribe",
    footer_subscribed: "Thank you for subscribing!",
    all_rights: "All rights reserved"
  });

  const handleEmailSubscribe = async (e) => {
    e.preventDefault();
    setSubscribeError('');
    setSubscribed(false);
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setSubscribeError('Please enter a valid email address');
      return;
    }
    
    // TODO: Implement email subscription backend API
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navigation */}
      <StickyNavbar />
      
      {/* Hero Carousel */}
      <HeroCarousel />
      
      {/* App Install Banner - Hidden for now */}
      {/* <AppInstallBanner /> */}
      
      {/* Our Story */}
      <OurStoryImproved />

      {/* Eloniot Credibility */}
      <EloniotCredibility />
      
      {/* Stats Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
              <div className="text-5xl font-bold text-blue-600 mb-2">10+</div>
              <div className="text-gray-600 font-medium">Years Experience</div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
              <div className="text-5xl font-bold text-blue-600 mb-2">40X</div>
              <div className="text-gray-600 font-medium">Faster Growth</div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
              <div className="text-5xl font-bold text-blue-600 mb-2">0%</div>
              <div className="text-gray-600 font-medium">Lead Leakage</div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Project Management Highlight Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Left side - Content */}
              <div className="text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Manage Multiple Projects, One Seamless Experience
                </h2>
                <p className="text-xl mb-4 opacity-90">
                  Work on multiple real estate projects simultaneously without losing context
                </p>
                <p className="text-lg mb-6 opacity-80 leading-relaxed">
                  Switch effortlessly between properties, leads, and developments. RealApex keeps all your projects organized and accessible - so you can focus on what matters most: closing deals and growing your business.
                </p>
                
                {/* Key Benefits */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✓</span>
                    <div>
                      <p className="font-semibold">Unified Dashboard</p>
                      <p className="text-sm opacity-80">See all projects, leads, and bookings in one place</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✓</span>
                    <div>
                      <p className="font-semibold">Context Switching Made Easy</p>
                      <p className="text-sm opacity-80">Jump between projects without losing track of important details</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✓</span>
                    <div>
                      <p className="font-semibold">Cross-Project Analytics</p>
                      <p className="text-sm opacity-80">Compare performance across all your developments</p>
                    </div>
                  </div>
                </div>
                
                <Link
                  to="/features"
                  className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                >
                  Explore All Features →
                </Link>
              </div>
              
              {/* Right side - Visual */}
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="space-y-4">
                    {/* Project Cards Mockup */}
                    <div className="bg-white rounded-lg p-4 shadow-xl transform hover:scale-105 transition">
                      <div className="flex items-center gap-3 mb-2">
                        <Building className="w-6 h-6 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">Green Valley Apartments</p>
                          <p className="text-xs text-gray-600">15 Leads • 8 Bookings • ₹2.4Cr</p>
                        </div>
                        <span className="text-green-600 text-xs font-semibold">Active</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-xl transform hover:scale-105 transition">
                      <div className="flex items-center gap-3 mb-2">
                        <Building className="w-6 h-6 text-purple-600" />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">Sunrise Villas</p>
                          <p className="text-xs text-gray-600">23 Leads • 12 Bookings • ₹5.1Cr</p>
                        </div>
                        <span className="text-green-600 text-xs font-semibold">Active</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-xl transform hover:scale-105 transition">
                      <div className="flex items-center gap-3 mb-2">
                        <Building className="w-6 h-6 text-orange-600" />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">Palm Residency</p>
                          <p className="text-xs text-gray-600">8 Leads • 3 Bookings • ₹1.2Cr</p>
                        </div>
                        <span className="text-green-600 text-xs font-semibold">Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-white/90 text-sm font-semibold">
                      Switch between projects with a single click
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              The Real Estate Problem
            </h2>
            <p className="text-xl text-gray-600">
              Traditional real estate operations lose money every day
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl p-8 shadow-md border border-red-100 hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">📉</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Lead Leakage</h3>
              <p className="text-gray-600 mb-4">
                Losing qualified leads due to poor follow-up and manual processes
              </p>
              <Link 
                to="/examples/lead-leakage"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
              >
                Learn More →
              </Link>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-md border border-red-100 hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">⏰</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Slow Processes</h3>
              <p className="text-gray-600 mb-4">
                Manual work, delayed payments, and inefficient operations
              </p>
              <Link 
                to="/examples/slow-processes"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
              >
                Learn More →
              </Link>
            </div>
            
            <div className="bg-white rounded-xl p-8 shadow-md border border-red-100 hover:shadow-xl transition-all">
              <div className="text-5xl mb-4">💸</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Revenue Loss</h3>
              <p className="text-gray-600 mb-4">
                Missing commissions, payment delays, and poor customer experience
              </p>
              <Link 
                to="/examples/revenue-loss"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
              >
                Learn More →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              RealApex SOFTWARE: The Complete Solution
            </h2>
            <p className="text-xl text-gray-600">
              Like AI transformed software development, we transform real estate operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature Cards */}
            {[
              {
                icon: '🏢',
                title: 'Multi-Project Management',
                description: 'Seamlessly manage multiple projects simultaneously - switch between developments without losing context'
              },
              {
                icon: '👥',
                title: 'FREE 24×7 Expert Advisory',
                description: 'Free expert advisory from experienced professionals - available 24×7 for budget, location, and investment guidance'
              },
              {
                icon: '📊',
                title: 'Smart CRM',
                description: 'Track every lead, automate follow-ups, zero leakage'
              },
              {
                icon: '💳',
                title: 'Payment Automation',
                description: 'Automated reminders, receipts, and commission tracking'
              },
              {
                icon: '🔗',
                title: 'Referral System',
                description: 'Turn customers into brand ambassadors with rewards'
              },
              {
                icon: '📱',
                title: 'Mobile App',
                description: 'PWA mobile app for on-the-go access'
              },
              {
                icon: '🌐',
                title: 'Multi-Language',
                description: 'English, Telugu, Hindi, and more'
              },
              {
                icon: '🎯',
                title: 'Visual Layouts',
                description: 'Interactive property layouts with real-time status'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 hover:shadow-lg transition-all">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Showcase Carousel */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Real Estate Solutions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to manage and grow your real estate business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Service Cards */}
            {[
              {
                icon: '📊',
                title: 'Smart CRM & Lead Management',
                description: 'Track leads, automate follow-ups, and never miss an opportunity',
                features: ['Lead scoring', 'Auto-assignment', 'Follow-up reminders', 'Conversion tracking'],
                link: '/solutions/crm'
              },
              {
                icon: '💰',
                title: 'Payment & Booking Automation',
                description: 'Streamline bookings, payments, and commission tracking',
                features: ['Online payments', 'EMI management', 'Commission splits', 'Payment reminders'],
                link: '/solutions/payments'
              },
              {
                icon: '🗺️',
                title: 'Visual Property Layouts',
                description: 'Interactive property maps with real-time availability',
                features: ['DXF/SVG import', 'Interactive maps', 'Live availability', 'Virtual tours'],
                link: '/solutions/property-layouts'
              },
              {
                icon: '👥',
                title: 'FREE 24×7 Expert Advisory',
                description: 'Free expert advisory from experienced professionals - available 24×7 for budget, location, and investment guidance',
                features: ['Budget advisory', 'Location insights', 'Investment analysis', 'Multi-language'],
                link: '/advisory'
              },
              {
                icon: '📧',
                title: 'Communication Hub',
                description: 'Automated SMS, Email, WhatsApp campaigns',
                features: ['Bulk messaging', 'Event triggers', 'Multi-language', 'Delivery reports'],
                link: '/solutions/communication'
              },
              {
                icon: '📈',
                title: 'Analytics & Insights',
                description: 'Data-driven decisions with comprehensive reports',
                features: ['Sales dashboard', 'Revenue reports', 'Team performance', 'Custom reports'],
                link: '/solutions/analytics'
              }
            ].map((service, index) => (
              <Link 
                key={index} 
                to={service.link}
                className="bg-white/80 rounded-xl p-8 hover:shadow-xl transition-all border border-gray-200/50 group cursor-pointer block"
              >
                <div className="text-6xl mb-4">{service.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <ul className="space-y-2 mb-4">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-700">
                      <span className="text-blue-600 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="text-blue-600 font-semibold group-hover:underline">
                  Learn More →
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link 
              to="/features" 
              className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
            >
              Explore All Features →
            </Link>
          </div>
        </div>
      </section>

      {/* Ecosystem Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Real Estate Ecosystem
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to succeed in one platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Real Estate Companies</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  Multi-project workspace - Manage unlimited projects simultaneously
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  Multi-tenant SaaS architecture for enterprise scale
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  Complete CRM and lead management with zero leakage
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  Booking and payment automation across all projects
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  Cross-project commission tracking and reports
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">For Customers</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  FREE 24×7 Expert Advisory - Get instant property guidance anytime
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  Customer portal for bookings & payments
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  Referral rewards and benefits
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  Educational content and insights
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FREE 24×7 Expert Advisory CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Left side - Expert Team Image */}
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_e1c4c75b-1560-4c52-a1d3-ae57271eccb9/artifacts/oyr6re22_ChatGPT%20Image%20Nov%201%2C%202025%2C%2009_59_36%20PM.png" 
                    alt="Expert Real Estate Advisory Team - Indian Women Professionals" 
                    className="rounded-xl shadow-2xl w-full"
                  />
                  <div className="absolute -bottom-4 -right-4 bg-white text-blue-600 px-6 py-3 rounded-lg shadow-xl font-bold">
                    🎯 10+ Years Experience
                  </div>
                </div>
              </div>
              
              {/* Right side - Content */}
              <div className="text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  FREE 24×7 Expert Advisory
                </h2>
                <p className="text-xl md:text-2xl mb-4 opacity-90">
                  Get instant, personalized guidance from our team of real estate experts
                </p>
                <p className="text-lg mb-6 opacity-80">
                  Our experienced advisors analyze your requirements and provide tailored recommendations within seconds
                </p>
                
                {/* Services List */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">💰</span>
                    <span>Budget Advisory</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📍</span>
                    <span>Location Insights</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">⭐</span>
                    <span>Best Projects</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📈</span>
                    <span>Investment Analysis</span>
                  </div>
                </div>
                
                <Link
                  to="/advisory"
                  className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                >
                  Talk to Our Experts Now →
                </Link>
                
                <p className="mt-6 text-sm opacity-75">
                  ✓ Available 24×7 &nbsp;&nbsp; ✓ Completely Free &nbsp;&nbsp; ✓ Instant Response &nbsp;&nbsp; ✓ Multi-language Support
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Partners Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Leading Real Estate Companies
            </h2>
            <p className="text-xl text-gray-600">
              Discover companies powered by RealApex across India
            </p>
          </div>

          {featuredTenants.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
                {featuredTenants.slice(0, 6).map((tenant) => (
                  <div
                    key={tenant.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all border-2 border-transparent hover:border-blue-500 group"
                  >
                    {/* Company Header */}
                    <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 text-white">
                      <div className="flex items-center gap-4">
                        {tenant.logo_url ? (
                          <img
                            src={tenant.logo_url}
                            alt={tenant.company_name}
                            className="h-14 w-14 bg-white rounded-full object-contain p-2"
                          />
                        ) : (
                          <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center">
                            <Building2 className="text-blue-600" size={28} />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{tenant.company_name}</h3>
                          <p className="text-sm text-blue-100">{tenant.location || tenant.city || tenant.state || 'India'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-6 bg-white">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{tenant.project_count || tenant.total_projects || 0}</div>
                          <div className="text-xs text-gray-600">Projects</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{tenant.property_count || tenant.total_properties || 0}</div>
                          <div className="text-xs text-gray-600">Properties</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{tenant.booking_count || tenant.total_bookings || 0}</div>
                          <div className="text-xs text-gray-600">Bookings</div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <button
                          onClick={() => navigate(`/public/tenant/${tenant.id}`)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Building2 size={18} />
                          View All Projects
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/public/tenant/${tenant.id}?tab=properties`)}
                            className="flex-1 px-3 py-2 bg-green-100 text-green-700 font-medium rounded-lg hover:bg-green-200 transition-all text-sm"
                          >
                            Properties
                          </button>
                          <button
                            onClick={() => navigate(`/public/tenant/${tenant.id}?tab=about`)}
                            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all text-sm"
                          >
                            About
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t text-center text-xs text-gray-500">
                        Member since {new Date(tenant.created_at).getFullYear()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={() => navigate('/tenants')}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
                >
                  <Building2 size={20} />
                  View All Companies
                  <ArrowRight size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Building2 size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Featured companies will appear here</p>
            </div>
          )}
        </div>
      </section>

      {/* Available Layouts Section - REDESIGNED */}
      {availableLayouts.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-block mb-4">
                <span className="px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                  Featured Projects
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Explore Available Layouts
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Interactive plot layouts from premium real estate projects
              </p>
            </div>

            {/* Featured Layout - Hero Style */}
            {availableLayouts[0] && (
              <div 
                onClick={() => window.open(`/public/layout-view/${availableLayouts[0].id}`, '_blank')}
                className="mb-12 cursor-pointer group"
              >
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* Image Side */}
                    <div className="relative h-[400px] bg-gradient-to-br from-blue-100 via-cyan-50 to-blue-100 overflow-hidden">
                      {availableLayouts[0].svg_url ? (
                        <img 
                          src={availableLayouts[0].svg_url} 
                          alt={availableLayouts[0].layout_name}
                          className="w-full h-full object-contain p-8 opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <MapPin size={120} className="text-blue-300" />
                        </div>
                      )}
                      {/* Overlay Badge */}
                      <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-bold text-gray-900">Featured Project</span>
                        </div>
                      </div>
                    </div>

                    {/* Info Side */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <h3 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                        {availableLayouts[0].layout_name}
                      </h3>
                      
                      {availableLayouts[0].tenant_name && (
                        <p className="text-gray-600 mb-6 flex items-center gap-2">
                          <Building size={18} />
                          <span>{availableLayouts[0].tenant_name}</span>
                        </p>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {availableLayouts[0].plot_count || 0}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Total Plots</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {availableLayouts[0].available_plots || 0}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Available</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {availableLayouts[0].layout_type?.split('_')[0] || 'Pro'}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">Type</div>
                        </div>
                      </div>

                      <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:shadow-xl transition-all flex items-center justify-center gap-3 group-hover:scale-105 duration-300">
                        <MapPin size={20} />
                        View Interactive Layout
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* More Layouts - Compact List */}
            {availableLayouts.length > 1 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Layers size={24} />
                  More Available Layouts
                </h3>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableLayouts.slice(1, 7).map((layout) => (
                    <div
                      key={layout.id}
                      onClick={() => window.open(`/public/layout-view/${layout.id}`, '_blank')}
                      className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500 group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Mini Thumbnail */}
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex-shrink-0 overflow-hidden">
                          {layout.svg_url ? (
                            <img 
                              src={layout.svg_url} 
                              alt={layout.layout_name}
                              className="w-full h-full object-contain p-2 opacity-70 group-hover:opacity-100 transition-opacity"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin size={32} className="text-blue-400" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {layout.layout_name}
                          </h4>
                          {layout.tenant_name && (
                            <p className="text-xs text-gray-500 truncate">{layout.tenant_name}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="text-gray-600">
                              <span className="font-semibold text-gray-900">{layout.plot_count || 0}</span> plots
                            </span>
                            <span className="text-green-600 font-semibold">
                              {layout.available_plots || 0} available
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="text-blue-600 group-hover:translate-x-1 transition-transform">
                          <ArrowRight size={20} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {availableLayouts.length > 7 && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => navigate('/layouts')}
                      className="px-8 py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 hover:shadow-xl transition-all inline-flex items-center gap-3"
                    >
                      View All {availableLayouts.length} Layouts
                      <ArrowRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Success Stories */}
      <SuccessStories />

      {/* Client Testimonials */}
      <TestimonialsCarousel />

      {/* Implementation & Support */}
      <ImplementationSupport />

      {/* Who Benefits - Complete Ecosystem */}
      <WhoBenefits />

      {/* Feature Highlights */}
      <FeatureHighlights />

      {/* ROI Calculator */}
      <ROICalculator />

      {/* Video Demo Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                See RealApex in Action
              </h2>
              <p className="text-xl text-gray-600">
                Watch how RealApex transforms real estate operations
              </p>
            </div>

            {/* Video Demo Placeholder */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center relative">
                <div className="text-center text-white">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Product Demo Video</h3>
                  <p className="text-white/90 text-lg">Coming Soon</p>
                  <p className="text-white/80 text-sm mt-4 max-w-md mx-auto">
                    Meanwhile, schedule a live demo with our team to see all features in action
                  </p>
                  <Link
                    to="/contact"
                    className="inline-block mt-6 px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-all shadow-lg"
                  >
                    Schedule Live Demo
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Feature Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { label: 'Multi-Project Dashboard', icon: '📊' },
                { label: 'Visual Property Layouts', icon: '🗺️' },
                { label: 'Payment Automation', icon: '💰' },
                { label: 'WhatsApp Integration', icon: '💬' }
              ].map((feature, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 text-center shadow-md hover:shadow-lg transition-all">
                  <div className="text-3xl mb-2">{feature.icon}</div>
                  <p className="text-sm font-semibold text-gray-800">{feature.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Hint Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-xl text-gray-600">
                Plans that grow with your business
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {/* Starter */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 hover:shadow-xl transition-all border-2 border-blue-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-blue-600">₹9,999</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Up to 2 Projects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">5 Team Members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">500 SMS Credits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Basic Support</span>
                  </li>
                </ul>
                <Link
                  to="/pricing"
                  className="block w-full py-3 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
                >
                  Learn More
                </Link>
              </div>

              {/* Professional - Most Popular */}
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-8 hover:shadow-2xl transition-all transform scale-105 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">₹24,999</span>
                  <span className="text-white/90">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">✓</span>
                    <span className="text-white">Up to 10 Projects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">✓</span>
                    <span className="text-white">25 Team Members</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">✓</span>
                    <span className="text-white">2000 SMS Credits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">✓</span>
                    <span className="text-white">Priority Support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 text-lg">✓</span>
                    <span className="text-white">Advanced Analytics</span>
                  </li>
                </ul>
                <Link
                  to="/pricing"
                  className="block w-full py-3 text-center bg-white text-blue-600 hover:bg-gray-100 font-semibold rounded-lg transition-all"
                >
                  Learn More
                </Link>
              </div>

              {/* Enterprise */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 hover:shadow-xl transition-all border-2 border-purple-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-purple-600">₹49,999</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Unlimited Projects</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Unlimited Users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">10,000 SMS Credits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">24/7 Dedicated Support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Custom Branding</span>
                  </li>
                </ul>
                <Link
                  to="/pricing"
                  className="block w-full py-3 text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all"
                >
                  Learn More
                </Link>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-lg"
              >
                View Full Pricing Details <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Support & Feature Request Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                We're Here to Help You Succeed
              </h2>
              <p className="text-xl text-gray-600">
                Comprehensive support and continuous improvement
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* Free Support */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl">🎁</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  First 3 Months Free Support
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started with confidence! We provide comprehensive free support for the first 3 months of your subscription.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Dedicated onboarding assistance</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Team training sessions</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Priority bug fixes</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 text-lg">✓</span>
                    <span className="text-gray-700">Technical consultation</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Conditions Apply:</strong> Valid for Professional and Enterprise plans. Basic support continues after 3 months as per plan.
                  </p>
                </div>
              </div>

              {/* Feature Requests */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Feature Requests & Updates
                </h3>
                <p className="text-gray-600 mb-6">
                  Your feedback drives our development! We continuously improve RealApex based on customer needs.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-lg">✓</span>
                    <span className="text-gray-700">Submit feature requests anytime</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-lg">✓</span>
                    <span className="text-gray-700">Vote on upcoming features</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-lg">✓</span>
                    <span className="text-gray-700">Automatic updates included</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 text-lg">✓</span>
                    <span className="text-gray-700">Latest version at no extra cost</span>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>High-demand features</strong> are prioritized for the latest software versions. All subscribers get free updates!
                  </p>
                  <Link
                    to="/contact"
                    className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all text-sm"
                  >
                    Submit Feature Request
                  </Link>
                </div>
              </div>
            </div>

            {/* Support Channels */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Multiple Support Channels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📞</span>
                  </div>
                  <p className="font-semibold text-gray-900">Phone</p>
                  <p className="text-sm text-gray-600">+91 99483 03060</p>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💬</span>
                  </div>
                  <p className="font-semibold text-gray-900">WhatsApp</p>
                  <p className="text-sm text-gray-600">Quick Response</p>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">24/7 Support</p>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🗣️</span>
                  </div>
                  <p className="font-semibold text-gray-900">Languages</p>
                  <p className="text-sm text-gray-600">English, తెలుగు, हिंदी</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Transform Your Real Estate Business?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join hundreds of real estate companies using RealApex
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link 
                to="/register" 
                className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 shadow-lg transition-all"
              >
                Start Free Trial
              </Link>
              <Link 
                to="/pricing" 
                className="px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg transition-all"
              >
                View Pricing
              </Link>
            </div>

            {/* Email Subscription */}
            <div className="max-w-md mx-auto">
              <h3 className="text-xl mb-4">Get Real Estate Tips & Updates</h3>
              <form onSubmit={handleEmailSubscribe}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSubscribeError('');
                    }}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:outline-none focus:border-white"
                  />
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-all whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </div>
                {subscribeError && (
                  <div className="mt-2 px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-700 text-sm">{subscribeError}</p>
                  </div>
                )}
                {subscribed && (
                  <div className="mt-2 px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
                    <p className="text-green-700 text-sm">✓ Thank you! You're subscribed to our newsletter.</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="py-12 bg-gradient-to-br from-gray-100 to-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-blue-600">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">ℹ️</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Important Information & Disclaimer</h3>
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    <p>
                      <strong>Product Development & Continuous Improvement:</strong> RealApex Software is under continuous development and improvement. While we strive to deliver the best possible experience, features, functionality, and performance may vary based on usage patterns, system configurations, and specific business requirements. We are committed to addressing issues promptly and releasing regular updates.
                    </p>
                    <p>
                      <strong>Results May Vary:</strong> Success metrics, growth percentages (e.g., "40X faster"), and performance improvements mentioned on this website are based on specific client implementations and their unique business scenarios. Individual results may vary depending on various factors including but not limited to business size, market conditions, team adoption, data quality, and usage patterns. Past performance of other clients does not guarantee similar results for your business.
                    </p>
                    <p>
                      <strong>Feature Availability:</strong> Some features and integrations are subject to availability, third-party service dependencies, and your subscription plan. Features are continuously being added, modified, or improved based on technological advancements and customer feedback. We recommend contacting our team for the latest feature availability and roadmap.
                    </p>
                    <p>
                      <strong>Best Efforts & Support:</strong> We provide support and maintenance on a best-efforts basis. While we aim for 99.9% uptime and quick resolution of issues, factors beyond our control (such as internet connectivity, third-party service disruptions, or force majeure events) may occasionally affect service availability. We maintain regular backups and have disaster recovery procedures in place.
                    </p>
                    <p>
                      <strong>No Liability for Business Decisions:</strong> RealApex Software is a tool to assist in real estate management. Final business decisions, legal compliance, financial transactions, and regulatory adherence remain the sole responsibility of the user/organization. We recommend consulting with legal, financial, and tax professionals for business-critical decisions.
                    </p>
                    <p>
                      <strong>Testimonials & Case Studies:</strong> All testimonials featured on this website are from actual clients. However, specific numbers, percentages, and results mentioned are based on their individual experiences and may not be representative of typical results. Client names and details are used with permission.
                    </p>
                    <p>
                      <strong>Terms & Conditions:</strong> Use of RealApex Software is subject to our{' '}
                      <Link to="/terms-conditions" className="text-blue-600 hover:text-blue-700 font-semibold underline">
                        Terms & Conditions
                      </Link>,{' '}
                      <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-700 font-semibold underline">
                        Privacy Policy
                      </Link>, and{' '}
                      <Link to="/refund-policy" className="text-blue-600 hover:text-blue-700 font-semibold underline">
                        Refund Policy
                      </Link>. By using our software, you acknowledge and agree to these terms.
                    </p>
                    <p className="pt-3 border-t border-gray-200">
                      <strong>Contact Us:</strong> For clarifications, support, or concerns, please reach out to us at{' '}
                      <a href="tel:+919948303060" className="text-blue-600 hover:text-blue-700 font-semibold">
                        +91 9948303060
                      </a>{' '}
                      or{' '}
                      <a href="mailto:admin@realapex.in" className="text-blue-600 hover:text-blue-700 font-semibold">
                        admin@realapex.in
                      </a>
                      . We're committed to transparency and customer satisfaction.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 italic">
                This website is an informational and marketing platform for RealApex Software. All information is provided in good faith for general informational purposes only. We make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, or availability of the information, products, or services contained on this website.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 border-t border-gray-200">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">RealApex SOFTWARE</h3>
              <p className="text-gray-600">
                Transforming real estate operations with expert advisory and automation
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/features" className="text-gray-600 hover:text-blue-600">Features</Link></li>
                <li><Link to="/pricing" className="text-gray-600 hover:text-blue-600">Pricing</Link></li>
                <li><Link to="/content" className="text-gray-600 hover:text-blue-600">Knowledge Hub</Link></li>
                <li><Link to="/advisory" className="text-gray-600 hover:text-blue-600">FREE 24×7 Expert Advisory</Link></li>
                <li><Link to="/tenants" className="text-gray-600 hover:text-blue-600">Our Partners</Link></li>
                <li><Link to="/faq" className="text-gray-600 hover:text-blue-600">FAQ for Companies</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Company</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-600 hover:text-blue-600">About Us</Link></li>
                <li><Link to="/contact" className="text-gray-600 hover:text-blue-600">Contact Us</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Legal & Policies</h4>
              <ul className="space-y-2">
                <li><Link to="/privacy-policy" className="text-gray-600 hover:text-blue-600">Privacy Policy</Link></li>
                <li><Link to="/terms-conditions" className="text-gray-600 hover:text-blue-600">Terms & Conditions</Link></li>
                <li><Link to="/refund-policy" className="text-gray-600 hover:text-blue-600">Cancellation & Refund</Link></li>
                <li><Link to="/shipping-policy" className="text-gray-600 hover:text-blue-600">Shipping Policy</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Get Started</h4>
              <ul className="space-y-2">
                <li><Link to="/register" className="text-gray-600 hover:text-blue-600">Sign Up</Link></li>
                <li><Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8">
            <div className="text-center mb-4">
              <p className="text-gray-600 mb-2">
                © 2025 RealApex SOFTWARE. All rights reserved. | 10+ Years in Real Estate Excellence
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Secure payments powered by Razorpay & Stripe | Data protected with industry-standard encryption
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Results may vary. Subject to{' '}
                <Link to="/terms-conditions" className="text-blue-600 hover:underline">Terms & Conditions</Link>.{' '}
                Features under continuous improvement. This is a marketing website - actual product functionality may vary.
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Floating WhatsApp Button */}
      <FloatingWhatsApp />
      
      {/* Smart Chatbot Widget - Lead Generation */}
      <ChatbotWidget />
    </div>
  );
};

export default Home;
