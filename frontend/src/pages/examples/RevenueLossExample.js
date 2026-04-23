import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, Check, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import StickyNavbar from '../../components/StickyNavbar';

const RevenueLossExample = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      
      <div className="pt-24 pb-16 bg-gradient-to-r from-red-600 to-pink-600">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white hover:text-gray-200 mb-8">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          
          <div className="max-w-5xl mx-auto text-center text-white">
            <TrendingDown className="w-20 h-20 mx-auto mb-6" />
            <h1 className="text-5xl font-bold mb-6">
              The Revenue Loss Crisis
            </h1>
            <p className="text-2xl mb-4">
              Missing commissions, payment delays, and poor experience cost millions
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 inline-block">
              <p className="text-3xl font-bold">25-35%</p>
              <p className="text-lg opacity-90">Average revenue loss due to inefficiencies</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          {/* BEFORE */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-red-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Revenue Leakage Points</h2>
              <X className="w-12 h-12 text-red-500" />
            </div>

            <div className="space-y-6">
              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="font-bold text-red-800 mb-3 text-xl">💸 Missed Commissions</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>❌ No tracking of agent referrals</li>
                  <li>❌ Manual calculation leads to errors</li>
                  <li>❌ Disputes waste time & money</li>
                  <li>❌ Lost commissions from forgotten deals</li>
                </ul>
                <div className="mt-4 bg-red-100 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">Annual Loss</p>
                  <p className="text-2xl font-bold text-red-600">₹15-20L</p>
                </div>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="font-bold text-red-800 mb-3 text-xl">⏰ Payment Delays</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>❌ Manual reminders get forgotten</li>
                  <li>❌ Customers delay 30-60 days</li>
                  <li>❌ Cash flow problems</li>
                  <li>❌ Interest loss on delayed payments</li>
                </ul>
                <div className="mt-4 bg-red-100 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">Cash Flow Impact</p>
                  <p className="text-2xl font-bold text-red-600">₹50L+</p>
                </div>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="font-bold text-red-800 mb-3 text-xl">😞 Poor Customer Experience</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>❌ Customers get frustrated with delays</li>
                  <li>❌ No transparency in process</li>
                  <li>❌ Lost referrals & negative reviews</li>
                  <li>❌ Competitors steal customers</li>
                </ul>
                <div className="mt-4 bg-red-100 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">Lost Referrals Value</p>
                  <p className="text-2xl font-bold text-red-600">₹30L+</p>
                </div>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-green-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Revenue Optimization</h2>
              <Check className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-6">
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-bold text-green-800 mb-3 text-xl">💰 Commission Automation</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✅ Every sale auto-tracked</li>
                  <li>✅ Auto-calculation with 100% accuracy</li>
                  <li>✅ Zero disputes - full transparency</li>
                  <li>✅ Agents see earnings in real-time</li>
                </ul>
                <div className="mt-4 bg-green-100 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">Commissions Recovered</p>
                  <p className="text-2xl font-bold text-green-600">₹15-20L</p>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-bold text-green-800 mb-3 text-xl">⚡ Instant Payments</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✅ Automated payment reminders</li>
                  <li>✅ One-click payment links</li>
                  <li>✅ 60% faster collection</li>
                  <li>✅ Better cash flow management</li>
                </ul>
                <div className="mt-4 bg-green-100 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">Improved Cash Flow</p>
                  <p className="text-2xl font-bold text-green-600">₹50L+</p>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-bold text-green-800 mb-3 text-xl">😊 Amazing Experience</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✅ Customer portal for transparency</li>
                  <li>✅ Instant updates via WhatsApp</li>
                  <li>✅ 5-star reviews & referrals</li>
                  <li>✅ 40% more repeat business</li>
                </ul>
                <div className="mt-4 bg-green-100 p-3 rounded text-center">
                  <p className="text-sm text-gray-600">Referral Revenue</p>
                  <p className="text-2xl font-bold text-green-600">₹60L+</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Impact */}
        <div className="mt-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-12 text-white text-center max-w-5xl mx-auto">
          <TrendingUp className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6">Total Revenue Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-lg mb-2 opacity-90">Revenue Loss (Before)</p>
              <p className="text-4xl font-bold text-red-300">-₹95L</p>
            </div>
            <div>
              <p className="text-lg mb-2 opacity-90">Revenue Recovered (After)</p>
              <p className="text-5xl font-bold">+₹1.25 Cr</p>
            </div>
            <div>
              <p className="text-lg mb-2 opacity-90">Net Gain</p>
              <p className="text-4xl font-bold">₹2.2 Cr</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">Stop Revenue Leakage Now</h3>
          <p className="text-xl text-gray-600 mb-8">Start recovering your lost revenue today</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/919948303060?text=I want to stop revenue loss with RealApex!" target="_blank" rel="noopener noreferrer" className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl">
              💬 Chat on WhatsApp
            </a>
            <a href="tel:+919948303060" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl">
              📞 Call Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueLossExample;