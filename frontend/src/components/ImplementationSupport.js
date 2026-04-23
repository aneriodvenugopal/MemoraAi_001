import React from 'react';
import { Clock, Users, Shield, Database, Phone, Video, Smartphone, Download } from 'lucide-react';

const ImplementationSupport = () => {
  return (
    <div className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Implementation, Support & Security
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know before getting started
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Implementation Time */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 rounded-full p-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Quick Setup</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span><strong>Basic Setup:</strong> 1-2 hours (create account, add projects, invite team)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span><strong>Full Implementation:</strong> 3-5 days (data migration, training, customization)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span><strong>Team Training:</strong> 2 hours (hands-on session with your staff)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span><strong>Go Live:</strong> Same week you sign up!</span>
                    </li>
                  </ul>
                  <div className="mt-4 bg-blue-100 p-3 rounded-lg">
                    <p className="text-sm text-blue-900">
                      💡 <strong>We handle everything:</strong> Data import, user setup, and configuration included!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Training & Support */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="flex items-start gap-4">
                <div className="bg-green-600 rounded-full p-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Training & Support</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Free Training:</strong> 2-hour hands-on session (Telugu/Hindi/English)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Phone Support:</strong> Call us anytime during business hours</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>WhatsApp Support:</strong> Quick queries resolved via WhatsApp</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Email Support:</strong> Detailed queries within 4 hours</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span><strong>Telugu Support:</strong> Full support in Telugu language!</span>
                    </li>
                  </ul>
                  <div className="mt-4 bg-green-100 p-3 rounded-lg">
                    <p className="text-sm text-green-900">
                      📞 <strong>Contact:</strong> +91 99483 03060 | support@memoraai.in
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Security */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="flex items-start gap-4">
                <div className="bg-purple-600 rounded-full p-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Data Security</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">🔒</span>
                      <span><strong>Encrypted Storage:</strong> Bank-level 256-bit encryption</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">🔒</span>
                      <span><strong>Secure Servers:</strong> Hosted on AWS (Amazon Web Services)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">🔒</span>
                      <span><strong>Data Isolation:</strong> Your data completely separate from others</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">🔒</span>
                      <span><strong>Access Control:</strong> Role-based permissions for team</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-600 mr-2">🔒</span>
                      <span><strong>Compliance:</strong> GDPR compliant, India data residency</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Backup & Export */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 border border-orange-100">
              <div className="flex items-start gap-4">
                <div className="bg-orange-600 rounded-full p-3">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Backup & Export</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">💾</span>
                      <span><strong>Daily Backups:</strong> Automatic backups every 24 hours</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">💾</span>
                      <span><strong>30-Day Retention:</strong> Access backups from last 30 days</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">💾</span>
                      <span><strong>Data Export:</strong> Download all your data anytime (Excel/CSV)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">💾</span>
                      <span><strong>Reports Export:</strong> PDF exports for all reports</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">💾</span>
                      <span><strong>Your Data, Your Control:</strong> No vendor lock-in!</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile App & Video Demo Section */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Mobile App Screenshots */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8 border border-cyan-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-cyan-600 rounded-full p-3">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Mobile PWA App</h3>
                  <p className="text-gray-700">Works on any smartphone - Android or iOS</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h4 className="font-bold text-gray-900 mb-4">Key Mobile Features:</h4>
                <ul className="space-y-2 text-gray-700 text-sm mb-4">
                  <li className="flex items-start">
                    <span className="text-cyan-600 mr-2">📱</span>
                    <span>Access leads, bookings, payments on the go</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-600 mr-2">📱</span>
                    <span>Quick lead entry with voice input</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-600 mr-2">📱</span>
                    <span>Click-to-call customers directly from app</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-600 mr-2">📱</span>
                    <span>WhatsApp share property details instantly</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan-600 mr-2">📱</span>
                    <span>Works offline - syncs when online</span>
                  </li>
                </ul>
                <div className="bg-cyan-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>No App Store download needed!</strong>
                  </p>
                  <p className="text-xs text-gray-600">
                    Just open website on phone → Click "Add to Home Screen"
                  </p>
                </div>
              </div>
            </div>

            {/* Video Demo */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-8 border border-red-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-red-600 rounded-full p-3">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Watch MemoraAI in Action</h3>
                  <p className="text-gray-700">2-minute video demo showing key features</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-4 border-2 border-gray-300">
                  <div className="text-center">
                    <Video className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-semibold">Video Demo Coming Soon!</p>
                    <p className="text-sm text-gray-500 mt-2">
                      In the meantime, schedule a live demo
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <a
                    href="/contact"
                    className="block w-full bg-red-600 hover:bg-red-700 text-white text-center font-bold py-3 rounded-lg transition-all"
                  >
                    📅 Schedule Live Demo (30 min)
                  </a>
                  <a
                    href="/register"
                    className="block w-full bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 text-center font-bold py-3 rounded-lg transition-all"
                  >
                    🚀 Start Free Trial Instead
                  </a>
                </div>
                
                <p className="text-xs text-gray-600 text-center mt-3">
                  Telugu, Hindi, English demos available
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-white">
            <h3 className="text-3xl font-bold mb-4">Still Have Questions?</h3>
            <p className="text-xl mb-6 text-white/90">
              We're here to help! Call, WhatsApp, or email us anytime.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="tel:+919948303060"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all"
              >
                <Phone className="w-5 h-5" />
                Call: +91 99483 03060
              </a>
              <a
                href="https://wa.me/919948303060"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition-all"
              >
                WhatsApp Support
              </a>
              <a
                href="mailto:support@memoraai.in"
                className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-800 transition-all border-2 border-white"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImplementationSupport;
