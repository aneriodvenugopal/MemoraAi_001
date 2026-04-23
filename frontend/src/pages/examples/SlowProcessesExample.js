import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, Check, Clock, Zap } from 'lucide-react';
import StickyNavbar from '../../components/StickyNavbar';

const SlowProcessesExample = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      
      <div className="pt-24 pb-16 bg-gradient-to-r from-orange-600 to-yellow-600">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white hover:text-gray-200 mb-8">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          
          <div className="max-w-5xl mx-auto text-center text-white">
            <Clock className="w-20 h-20 mx-auto mb-6 animate-spin-slow" />
            <h1 className="text-5xl font-bold mb-6">
              The Slow Process Problem
            </h1>
            <p className="text-2xl mb-4">
              Manual work wastes 20+ hours every week and costs millions
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 inline-block">
              <p className="text-3xl font-bold">20 Hours/Week</p>
              <p className="text-lg opacity-90">Wasted on manual data entry and paperwork</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          {/* BEFORE */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-orange-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Manual Process - Traditional Way</h2>
              <X className="w-12 h-12 text-orange-500" />
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="font-bold text-orange-800 mb-2">Payment Collection (2 hours/day)</p>
                <p className="text-gray-700">• Manually collect cash/cheques
• Write receipts by hand
• Update Excel sheet
• Bank visit to deposit
• Call customers for reminders</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="font-bold text-orange-800 mb-2">Report Generation (4 hours/week)</p>
                <p className="text-gray-700">• Compile data from multiple sheets
• Calculate totals manually
• Create PowerPoint presentation
• Send emails to management</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="font-bold text-orange-800 mb-2">Commission Calculations (6 hours/month)</p>
                <p className="text-gray-700">• Check each sale manually
• Calculate percentages
• Resolve disputes
• Create payment vouchers</p>
              </div>
            </div>

            <div className="border-t-2 border-orange-200 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">Weekly Manual Work</p>
                  <p className="text-2xl font-bold text-orange-600">20+ hrs</p>
                </div>
                <div className="bg-orange-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">Payment Delays</p>
                  <p className="text-2xl font-bold text-orange-600">7-10 days</p>
                </div>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-green-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Automated with RealApex</h2>
              <Check className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-bold text-green-800 mb-2">Payment Collection (5 minutes/day)</p>
                <p className="text-gray-700">✅ Send payment link via WhatsApp
✅ Customer pays online
✅ Receipt auto-generated & sent
✅ Accounts auto-updated
✅ Auto-reminders sent</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-bold text-green-800 mb-2">Report Generation (2 clicks)</p>
                <p className="text-gray-700">✅ Real-time dashboards
✅ Auto-updated reports
✅ One-click PDF export
✅ Scheduled email delivery</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-bold text-green-800 mb-2">Commission Calculations (Automatic)</p>
                <p className="text-gray-700">✅ Auto-calculated on sale
✅ Transparent for all agents
✅ Instant approval workflow
✅ Direct bank transfer</p>
              </div>
            </div>

            <div className="border-t-2 border-green-200 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">Weekly Manual Work</p>
                  <p className="text-2xl font-bold text-green-600">0 hrs</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">Payment Collection</p>
                  <p className="text-2xl font-bold text-green-600">Instant</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact */}
        <div className="mt-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl p-12 text-white text-center max-w-5xl mx-auto">
          <Zap className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6">Time & Cost Savings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-5xl font-bold mb-2">20</p>
              <p className="text-xl">Hours Saved/Week</p>
            </div>
            <div>
              <p className="text-5xl font-bold mb-2">60%</p>
              <p className="text-xl">Faster Payments</p>
            </div>
            <div>
              <p className="text-5xl font-bold mb-2">₹10L+</p>
              <p className="text-xl">Annual Savings</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">Automate Your Operations Today</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/919948303060?text=I want to automate my operations with RealApex!" target="_blank" rel="noopener noreferrer" className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl">
              💬 Chat on WhatsApp
            </a>
            <Link to="/solutions/payments" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl">
              See Payment Automation →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlowProcessesExample;