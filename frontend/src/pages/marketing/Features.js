import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Features = () => {
  const featureSections = [
    {
      title: 'Anti-Leakage System',
      icon: '🔒',
      image: 'https://images.unsplash.com/photo-1620519086896-1cfd9f8114ab?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzc3xlbnwwfHx8Ymx1ZXwxNzYwOTcxOTAxfDA&ixlib=rb-4.1.0&q=85',
      features: [
        'Track every lead from first contact to closing',
        'Automated follow-up reminders prevent lead abandonment',
        'Real-time alerts for unattended leads',
        'Complete audit trail of all interactions',
        'Zero leads slip through the cracks'
      ]
    },
    {
      title: 'Free 24 X 7 Expert Advisory',
      icon: '👥',
      image: 'https://images.unsplash.com/photo-1650784854859-a1e4b01779c6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjByZWFsJTIwZXN0YXRlJTIwdGVhbXxlbnwwfHx8fDE3NjIyNDk4ODF8MA&ixlib=rb-4.1.0&q=85',
      description: 'AI-powered advisory trained on 10+ years of real estate expertise. Get instant, intelligent guidance 24×7 based on real market data and expert knowledge.',
      features: [
        'Budget Advisory: Smart property recommendations based on budget & market analysis',
        'Location Highlights: AI-powered location analysis with connectivity insights',
        'Numerology Advisory: Auspicious property selection with cultural guidance',
        'Best Project Advisory: Data-driven project recommendations from real trends',
        'Future Investment Advisory: Market trends & growth predictions based on analytics',
        'Instant Response: Get expert-level advice in 30 seconds, any time of day'
      ]
    },
    {
      title: 'Smart CRM',
      icon: '📊',
      features: [
        'Centralized lead management with quality scoring',
        'Automated lead assignment and distribution',
        'Custom fields and tags for organization',
        'Lead source tracking and ROI analysis',
        'Mobile and web access for field agents'
      ]
    },
    {
      title: 'Visual Property Layouts',
      icon: '🎯',
      features: [
        'Interactive SVG-based property layouts',
        'Real-time plot availability status',
        'Color-coded status visualization',
        'Shareable public links for customers',
        'Support for DXF, PDF, SVG file imports',
        'Smart plot detection and auto-mapping'
      ]
    },
    {
      title: 'Payment Automation',
      icon: '💳',
      features: [
        'Automated payment reminders via SMS/Email/WhatsApp',
        'Payment schedule tracking and alerts',
        'Overdue payment notifications',
        'Digital payment receipts',
        'Commission calculation and tracking',
        'Payment analytics and reports'
      ]
    },
    {
      title: 'Referral System',
      icon: '🔗',
      features: [
        'Unique referral codes for each customer',
        'Track referral conversions and rewards',
        'Incentivize customer advocacy',
        'Referral analytics dashboard',
        'Automated reward distribution'
      ]
    },
    {
      title: 'Multi-Channel Communication',
      icon: '📱',
      features: [
        'SMS notifications for urgent updates',
        'Professional email campaigns',
        'WhatsApp Business API integration',
        'Automated OTP delivery',
        'Multi-language support (English, Telugu, Hindi)',
        'Template management for consistent messaging'
      ]
    },
    {
      title: 'Mobile PWA App',
      icon: '📲',
      features: [
        'Progressive Web App for mobile devices',
        'Works offline with cached data',
        'Native app-like experience',
        'Push notifications support',
        'Quick access to key features',
        'In-app browser for full web features'
      ]
    },
    {
      title: 'Analytics & Reports',
      icon: '📈',
      features: [
        'Lead conversion funnel analysis',
        'Sales performance tracking by project',
        'Payment collection reports',
        'Commission tracking and distribution',
        'Staff performance metrics',
        'Excel export for all reports',
        'Custom date range filtering'
      ]
    },
    {
      title: 'Multi-Tenant Architecture',
      icon: '🏢',
      features: [
        'Complete data isolation per tenant',
        'Custom branding for each organization',
        'Role-based access control',
        'Super Admin, Tenant Admin, Staff, Customer roles',
        'Tenant-level settings and preferences',
        'Scalable cloud infrastructure'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center text-white hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="mr-2" />
            Back to Home
          </Link>
          
          <div className="flex gap-4">
            <Link 
              to="/login" 
              className="px-6 py-2 text-white hover:text-cyan-300 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Powerful Features for Modern Real Estate
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Everything you need to run a profitable real estate business with zero leakage
          </p>
        </div>

        {/* Feature Sections */}
        <div className="space-y-16">
          {featureSections.map((section, index) => (
            <div 
              key={index}
              className={`flex flex-col ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } gap-8 items-center`}
            >
              {/* Image (if exists) */}
              {section.image && (
                <div className="w-full md:w-1/2">
                  <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                    <img 
                      src={section.image}
                      alt={section.title}
                      className="w-full h-80 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-transparent" />
                  </div>
                </div>
              )}
              
              {/* Content */}
              <div className={`w-full ${section.image ? 'md:w-1/2' : 'max-w-4xl mx-auto'}`}>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                  <div className="flex items-center mb-6">
                    <div className="text-5xl mr-4">{section.icon}</div>
                    <h2 className="text-3xl font-bold text-white">{section.title}</h2>
                  </div>
                  
                  {section.description && (
                    <p className="text-lg text-cyan-200 mb-6 leading-relaxed italic">
                      {section.description}
                    </p>
                  )}
                  
                  <ul className="space-y-3">
                    {section.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start text-gray-200">
                        <span className="text-cyan-400 mr-3 flex-shrink-0 mt-1">✓</span>
                        <span className="text-lg">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ecosystem Section */}
        <div className="mt-20 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 backdrop-blur-md rounded-2xl p-12 border border-cyan-400/30">
          <h2 className="text-4xl font-bold text-white text-center mb-8">
            Complete Real Estate Ecosystem
          </h2>
          <p className="text-xl text-gray-200 text-center mb-12">
            RealApex isn't just software – it's a complete ecosystem for real estate success
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-bold text-white mb-3">IncomeLands Platform</h3>
              <p className="text-gray-200">
                Dedicated website and mobile app for property listings and customer engagement
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">📺</div>
              <h3 className="text-xl font-bold text-white mb-3">YouTube Education</h3>
              <p className="text-gray-200">
                Educational content and property showcases on our YouTube channels
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-white mb-3">Our Agents Network</h3>
              <p className="text-gray-200">
                Access to our network of trained real estate agents for your projects
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Experience RealApex?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Start your free trial today – no credit card required
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register" 
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all"
            >
              Start Free Trial
            </Link>
            <Link 
              to="/pricing" 
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/50 py-8 border-t border-white/10 mt-16">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2025 RealApex. All rights reserved. | 10+ Years in Real Estate Excellence
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Features;
