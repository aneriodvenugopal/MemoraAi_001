import React from 'react';
import { Award, Globe, Shield, Code, Building2, Zap, CheckCircle, TrendingUp, Users } from 'lucide-react';

const EloniotCredibility = () => {
  const industries = [
    { name: 'Cable TV Billing', icon: '📺', count: 'Multiple clients' },
    { name: 'Restaurant Management', icon: '🍽️', count: 'POS & Billing' },
    { name: 'Garments & Textile', icon: '👔', count: 'Inventory Management' },
    { name: 'Water Plant Billing', icon: '💧', count: 'Utilities Sector' },
    { name: 'Labour Contract Billing', icon: '👷', count: 'Construction Sector' },
    { name: 'Interior Business', icon: '🏠', count: 'Design & Execution' },
    { name: 'Inventory Applications', icon: '📦', count: 'Multiple Industries' },
    { name: 'Transport Logistics', icon: '🚛', count: 'Australian Clients' },
    { name: 'E-commerce Platforms', icon: '🛒', count: 'Ratnajyoti & More' },
    { name: 'Government Projects', icon: '🏛️', count: 'Telangana Library' },
    { name: 'CCTV Inventory', icon: '📹', count: 'Cyberabad Govt Project' },
    { name: 'NGO Websites', icon: '🤝', count: 'Social Sector' },
    { name: 'Service Companies', icon: '⚡', count: 'B2B Solutions' },
    { name: 'Real Estate', icon: '🏢', count: 'MemoraAI' }
  ];

  const highlights = [
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'International Reach',
      description: 'Successfully delivered Transport Logistics Software to Australian clients',
      color: 'blue'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Government Projects',
      description: 'Third-party software vendor for Telangana Government - Cyberabad CCTV Inventory System & Library Management Applications',
      color: 'green'
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: '14+ Industry Verticals',
      description: 'Proven expertise across diverse business sectors and use cases',
      color: 'purple'
    },
    {
      icon: <Code className="w-8 h-8" />,
      title: 'Full-Stack Development',
      description: 'From billing software to e-commerce platforms - complete solutions',
      color: 'orange'
    }
  ];

  const recentClients = [
    {
      name: 'Cyberabad CCTV Project',
      website: '#',
      description: 'Inventory management system for Government CCTV surveillance project',
      type: '🏛️ Government Project',
      highlight: true
    },
    {
      name: 'Telangana Library System',
      website: '#',
      description: 'Government library management application for public libraries',
      type: '🏛️ Government Project',
      highlight: true
    },
    {
      name: 'V3 Electricals',
      website: 'https://v3electricals.com/',
      description: 'Professional electrical services website',
      type: 'Website Development'
    },
    {
      name: 'Ratnajyoti',
      website: '#',
      description: 'E-commerce platform for jewelry business',
      type: 'E-commerce Application'
    }
  ];

  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-full mb-6">
              <Building2 className="w-6 h-6 text-blue-600" />
              <span className="text-blue-900 font-bold text-lg">Powered by Eloniot Software Solutions</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Trust MemoraAI?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              MemoraAI is built by <strong>Eloniot Software Solutions</strong> - a proven software company with successful implementations across <strong>14+ industries</strong>, including Government projects and International clients.
            </p>
          </div>

          {/* Key Highlights */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {highlights.map((highlight, index) => (
              <div key={index} className={`bg-gradient-to-br from-${highlight.color}-50 to-${highlight.color}-100 rounded-xl p-6 border border-${highlight.color}-200 hover:shadow-xl transition-all`}>
                <div className={`text-${highlight.color}-600 mb-4`}>
                  {highlight.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {highlight.title}
                </h3>
                <p className="text-gray-700 text-sm">
                  {highlight.description}
                </p>
              </div>
            ))}
          </div>

          {/* Industries Served */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Proven Expertise Across Multiple Industries
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {industries.map((industry, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-200 border border-gray-200 transition-all group">
                  <div className="text-3xl mb-2">{industry.icon}</div>
                  <h4 className="font-bold text-gray-900 mb-1 text-sm group-hover:text-blue-600">
                    {industry.name}
                  </h4>
                  <p className="text-xs text-gray-600">{industry.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Why This Matters */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-200 mb-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              What This Means for You
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-4xl mb-3">🎯</div>
                <h4 className="font-bold text-gray-900 mb-2">Deep Tech Expertise</h4>
                <p className="text-gray-700 text-sm">
                  We've built complex billing systems, inventory management, logistics platforms - Real Estate is where we excel the most!
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-4xl mb-3">🛡️</div>
                <h4 className="font-bold text-gray-900 mb-2">Government-Grade Reliability</h4>
                <p className="text-gray-700 text-sm">
                  Trusted by Telangana Government for critical applications - Cyberabad CCTV Inventory System & Library Management. Your data and operations are in experienced hands.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="text-4xl mb-3">🌏</div>
                <h4 className="font-bold text-gray-900 mb-2">International Standards</h4>
                <p className="text-gray-700 text-sm">
                  Our solutions meet Australian client standards. You get world-class software at Indian pricing!
                </p>
              </div>
            </div>
          </div>

          {/* Recent Clients */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Recent Client Projects
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentClients.map((client, index) => (
                <div key={index} className={`${client.highlight ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300' : 'bg-white border border-gray-200'} rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 text-sm">{client.name}</h4>
                    {client.website !== '#' && (
                      <a 
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                      >
                        Visit →
                      </a>
                    )}
                  </div>
                  <p className="text-gray-700 text-xs mb-3">{client.description}</p>
                  <span className={`inline-block px-3 py-1 ${client.highlight ? 'bg-green-500 text-white' : 'bg-blue-100 text-blue-700'} text-xs font-semibold rounded-full`}>
                    {client.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-3xl font-bold mb-8 text-center">Eloniot Software Solutions by Numbers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">14+</div>
                <div className="text-white/90">Industries Served</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">100+</div>
                <div className="text-white/90">Applications Built</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">50+</div>
                <div className="text-white/90">Active Clients</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">10+</div>
                <div className="text-white/90">Years Experience</div>
              </div>
            </div>
          </div>

          {/* Bottom Message */}
          <div className="mt-12 text-center bg-green-50 rounded-xl p-8 border border-green-200">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              MemoraAI is Not Our First Rodeo!
            </h3>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto">
              We've successfully built and deployed software for <strong>Government, International clients, E-commerce, Logistics, Manufacturing, Services</strong> and more. 
              Real Estate software is what we know best - <strong>MemoraAI is the culmination of our 10+ years of software development expertise.</strong>
            </p>
            <div className="mt-6">
              <span className="inline-block bg-white px-6 py-3 rounded-lg border-2 border-green-500 text-green-700 font-bold">
                ✅ Proven Track Record • ✅ Government Trusted • ✅ International Quality
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EloniotCredibility;
