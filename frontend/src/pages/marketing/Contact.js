import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement contact form backend API
    toast.success('Thank you! We will contact you soon.');
    setFormData({ name: '', email: '', phone: '', company: '', message: '' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

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

      {/* Contact Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white mb-2">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  placeholder="Your name"
                  aria-label="Full name"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  placeholder="your@email.com"
                  aria-label="Email address"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Phone</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  placeholder="+91 XXXXXXXXXX"
                  aria-label="Phone number"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  autoComplete="organization"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  placeholder="Your company name"
                  aria-label="Company name"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Message *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                  placeholder="Tell us about your requirements..."
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-all"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <Mail className="w-6 h-6 text-cyan-400 mr-4 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Email</h3>
                    <a href="mailto:info@realapex.in" className="text-gray-300 hover:text-cyan-400">
                      info@realapex.in
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="w-6 h-6 text-cyan-400 mr-4 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Phone</h3>
                    <a href="tel:+919948303060" className="text-gray-300 hover:text-cyan-400">
                      +91 99483 03060
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="w-6 h-6 text-cyan-400 mr-4 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Office</h3>
                    <p className="text-gray-300">
                      India
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Quick Links</h2>
              
              <div className="space-y-3">
                <Link to="/pricing" className="block text-gray-300 hover:text-cyan-400 transition-colors">
                  → View Pricing Plans
                </Link>
                <Link to="/features" className="block text-gray-300 hover:text-cyan-400 transition-colors">
                  → Explore Features
                </Link>
                <Link to="/about" className="block text-gray-300 hover:text-cyan-400 transition-colors">
                  → Learn About Us
                </Link>
                <Link to="/register" className="block text-gray-300 hover:text-cyan-400 transition-colors">
                  → Start Free Trial
                </Link>
              </div>
            </div>

            {/* Support Hours */}
            <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 backdrop-blur-md rounded-2xl p-8 border border-cyan-400/30">
              <h2 className="text-2xl font-bold text-white mb-4">Support Hours</h2>
              <p className="text-gray-200">
                <strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM IST<br />
                <strong>Saturday:</strong> 10:00 AM - 4:00 PM IST<br />
                <strong>Sunday:</strong> Closed
              </p>
              <p className="text-cyan-300 mt-4">
                Enterprise customers get 24/7 support
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/50 py-8 border-t border-white/10 mt-16">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2025 MemoraAI. All rights reserved. | 10+ Years in Real Estate Excellence
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
