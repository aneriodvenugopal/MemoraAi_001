import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for small real estate agencies',
      price: { monthly: '₹9,999', yearly: '₹99,990' },
      features: [
        '5 Projects',
        '100 Properties',
        '1,000 SMS credits/month',
        '500 Email credits/month',
        'Basic CRM & Booking',
        'Mobile App Access',
        'Email Support',
        'Property Layouts',
        'Lead Management'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Professional',
      description: 'For growing real estate businesses',
      price: { monthly: '₹24,999', yearly: '₹249,990' },
      features: [
        '25 Projects',
        '1,000 Properties',
        '5,000 SMS credits/month',
        '2,000 Email credits/month',
        'Advanced Analytics',
        'Referral System',
        'AI Advisory System',
        'Multi-user Support',
        'WhatsApp Integration',
        'Priority Support',
        'Custom Reports',
        'Payment Automation'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      description: 'For large real estate enterprises',
      price: { monthly: '₹49,999', yearly: '₹499,990' },
      features: [
        'Unlimited Projects',
        'Unlimited Properties',
        '20,000 SMS credits/month',
        '10,000 Email credits/month',
        'White-label Solution',
        'Custom Integrations',
        'Dedicated Account Manager',
        'Custom Training',
        'API Access',
        'Advanced Security',
        'Custom Features',
        '24/7 Phone Support'
      ],
      cta: 'Contact Sales',
      popular: false
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

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Choose the perfect plan for your real estate business
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-lg ${billingCycle === 'monthly' ? 'text-white font-semibold' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-16 h-8 bg-white/20 rounded-full transition-colors"
            >
              <div 
                className={`absolute top-1 w-6 h-6 bg-cyan-500 rounded-full transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-lg ${billingCycle === 'yearly' ? 'text-white font-semibold' : 'text-gray-400'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="ml-2 px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                Save 17%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border transition-all hover:scale-105 ${
                plan.popular 
                  ? 'border-cyan-400 shadow-2xl shadow-cyan-500/50' 
                  : 'border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="px-6 py-2 bg-cyan-500 text-white text-sm font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-300 text-sm mb-4">{plan.description}</p>
                <div className="text-4xl font-bold text-cyan-300 mb-2">
                  {plan.price[billingCycle]}
                </div>
                <div className="text-gray-400 text-sm">
                  per {billingCycle === 'monthly' ? 'month' : 'year'}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start text-gray-200">
                    <Check className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.cta === 'Contact Sales' ? '/contact' : '/register'}
                className={`block w-full py-3 text-center font-semibold rounded-lg transition-all ${
                  plan.popular
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Custom Package Section */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 backdrop-blur-md rounded-2xl p-12 border border-cyan-400/30 mb-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Need a Custom Package?
            </h2>
            <p className="text-xl text-gray-300 mb-6">
              We'll create a tailored solution that fits your exact requirements
            </p>
            <Link 
              to="/contact"
              className="inline-block px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg shadow-lg transition-all"
            >
              Contact Our Sales Team
            </Link>
          </div>
        </div>

        {/* Credits Information */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Understanding Your Credits
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">📱</div>
              <h3 className="text-xl font-bold text-white mb-2">SMS Credits</h3>
              <p className="text-gray-300">
                Send OTPs, payment reminders, booking confirmations via SMS
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">📧</div>
              <h3 className="text-xl font-bold text-white mb-2">Email Credits</h3>
              <p className="text-gray-300">
                Send detailed reports, invoices, and newsletters via email
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-xl font-bold text-white mb-2">Upgrade Anytime</h3>
              <p className="text-gray-300">
                Need more? Upgrade or downgrade your plan at any time
              </p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            {[
              {
                q: 'Can I upgrade or downgrade my plan?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.'
              },
              {
                q: 'What happens if I exceed my SMS/Email credits?',
                a: 'You can purchase additional credits at any time through your dashboard, or upgrade to a higher plan for more monthly credits.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required.'
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a 30-day money-back guarantee if you\'re not satisfied with our platform.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-gray-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/50 py-8 border-t border-white/10 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            © 2025 RealApex. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
