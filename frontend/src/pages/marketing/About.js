import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const About = () => {
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
            About RealApex
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            10 Years of Excellence in Real Estate Technology
          </p>
        </div>

        {/* Our Story */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
            <div className="space-y-4 text-gray-200 text-lg">
              <p>
                For over <span className="text-cyan-300 font-semibold">10 years</span>, we've been working with real estate companies 
                across India, helping them solve their most critical business challenges. We've witnessed firsthand the 
                struggles of lost leads, inefficient operations, and missed opportunities.
              </p>
              <p>
                Our journey started with a simple observation: <span className="text-cyan-300 font-semibold">Real estate companies 
                lose money not because they lack opportunities, but because of operational leakages.</span>
              </p>
              <p>
                We set out to solve this problem comprehensively. The result is RealApex – a complete ecosystem that plugs 
                every leak, automates every process, and maximizes every opportunity.
              </p>
            </div>
          </div>
        </div>

        {/* Our Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-gray-200 text-lg">
              To empower real estate businesses with technology that delivers 
              <span className="text-cyan-300 font-semibold"> 40X faster growth</span>, just like AI transformed 
              software development.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-4">Our Vision</h2>
            <p className="text-gray-200 text-lg">
              To become the #1 real estate automation platform globally, helping thousands of real estate 
              companies achieve <span className="text-cyan-300 font-semibold">zero leakage and maximum profitability</span>.
            </p>
          </div>
        </div>

        {/* What Makes Us Unique */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            What Makes Us Different
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-4">Real Estate DNA</h3>
              <p className="text-gray-200">
                Unlike generic CRM tools, we're built specifically for Indian real estate by experts with 10+ years 
                in the industry. We understand your challenges because we've lived them.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-2xl font-bold text-white mb-4">Win-Win Philosophy</h3>
              <p className="text-gray-200">
                We create win-win situations for everyone: real estate companies get more sales, agents get better 
                commissions, and customers get superior service.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-5xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold text-white mb-4">Complete Ecosystem</h3>
              <p className="text-gray-200">
                We're not just software – we're an ecosystem. Our platform includes IncomeLands app, AI advisory, 
                YouTube education, content marketing, and more.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-4">40X Faster Results</h3>
              <p className="text-gray-200">
                Our proven systems and automation help real estate companies achieve results that would traditionally 
                take years – in just months.
              </p>
            </div>
          </div>
        </div>

        {/* Our Values */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 backdrop-blur-md rounded-2xl p-12 border border-cyan-400/30 mb-16">
          <h2 className="text-4xl font-bold text-white text-center mb-12">Our Core Values</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-3">Zero Leakage</h3>
              <p className="text-gray-200">
                Every lead, every opportunity, every rupee tracked and accounted for
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-3">Speed & Efficiency</h3>
              <p className="text-gray-200">
                Automate everything that can be automated, so you can focus on growth
              </p>
            </div>

            <div className="text-center">
              <div className="text-5xl mb-4">❤️</div>
              <h3 className="text-xl font-bold text-white mb-3">Customer Success</h3>
              <p className="text-gray-200">
                Your success is our success – we're partners in your growth journey
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Real Estate Business?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of real estate companies achieving 40X faster growth
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
      <footer className="bg-gray-900/50 py-8 border-t border-white/10">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2025 RealApex. All rights reserved. | 10+ Years in Real Estate Excellence
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
