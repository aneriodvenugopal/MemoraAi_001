import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, Zap, Shield, DollarSign, Clock, TrendingUp } from 'lucide-react';
import EnquiryForm from '../../components/EnquiryForm';
import StickyNavbar from '../../components/StickyNavbar';

const PaymentsSolution = () => {
  const features = [
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: 'Multi-Gateway Support',
      description: 'Accept payments via Razorpay, Stripe, UPI, Cards, Net Banking, and Wallets'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Instant Payment Links',
      description: 'Send secure payment links via SMS/WhatsApp for instant collection'
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: 'EMI Options',
      description: 'Offer flexible installment plans to increase conversions'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Auto-Reconciliation',
      description: 'Payments automatically matched with bookings and receipts generated'
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Payment Reminders',
      description: 'Automated reminders for pending and upcoming payments'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Real-time Tracking',
      description: 'Monitor all payments, refunds, and outstanding amounts in real-time'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      <div className="pt-24 pb-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white hover:text-gray-200 mb-8">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Payment Automation
            </h1>
            <p className="text-2xl text-white/90 mb-8">
              Collect payments 60% faster with automated payment links, EMI options, and instant reconciliation.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                ⚡ 60% Faster Collection
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                🔒 100% Secure
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                📊 Auto-Reconciliation
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">The Problem</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">❌</span>
                  <span>Manual payment tracking causing delays and errors</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">❌</span>
                  <span>Customers delaying payments due to inconvenient methods</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">❌</span>
                  <span>Hours spent on payment reconciliation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">❌</span>
                  <span>Missing payment reminders leading to defaults</span>
                </li>
              </ul>
            </section>

            <section className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">The Solution</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="text-blue-600 mb-3">{feature.icon}</div>
                    <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Benefits</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-lg text-gray-700">60% faster payment collection</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-lg text-gray-700">90% reduction in payment delays</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-lg text-gray-700">Zero manual reconciliation</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-lg text-gray-700">PCI-DSS compliant security</span>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <EnquiryForm solutionName="Payment Automation" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsSolution;