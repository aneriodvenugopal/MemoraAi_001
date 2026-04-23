import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MessageCircle, Mail, Smartphone, Send, Clock, Globe, Users, Bell, FileText, Target, Zap, PhoneCall } from 'lucide-react';
import EnquiryForm from '../../components/EnquiryForm';
import StickyNavbar from '../../components/StickyNavbar';

const CommunicationSolution = () => {
  const features = [
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'WhatsApp Business Integration',
      description: 'Send property updates, payment reminders, and booking confirmations via WhatsApp with click-to-chat',
      details: 'Ready for WhatsApp Business API integration - personalized messages with customer name, property details, and payment links'
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'Smart SMS Campaigns',
      description: 'Bulk SMS with personalization for payment reminders, site visit confirmations, and offers',
      details: 'Template-based SMS with merge fields - automatically includes customer name, property, amount due, and payment links'
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: 'Professional Email Campaigns',
      description: 'Beautifully designed email templates for brochures, payment receipts, and follow-ups',
      details: 'Drag-and-drop email builder with property images, layouts, pricing tables, and call-to-action buttons'
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Automated Notifications',
      description: 'Trigger-based messaging - auto-send on booking, payment received, overdue alerts, site visits',
      details: 'Set once, forget forever - system sends the right message at the right time to the right customer'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Segmented Targeting',
      description: 'Send to specific groups - hot leads, booked customers, overdue payments, specific projects',
      details: 'Filter by project, budget range, lead status, location, or create custom segments for laser-focused campaigns'
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'Multi-Language Support',
      description: 'Send messages in Telugu, Hindi, or English - system auto-detects customer preference',
      details: 'Pre-built templates in 3 languages with automatic language selection based on customer profile'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Message Templates Library',
      description: '50+ ready-to-use templates for every scenario - payment, follow-up, site visit, offers',
      details: 'Professionally written, tested templates - just customize and send. Save your own templates for reuse'
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Scheduled Campaigns',
      description: 'Schedule messages for optimal times - morning reminders, evening offers, weekend updates',
      details: 'Queue bulk campaigns, schedule recurring messages, and set timezone-specific delivery for best engagement'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Delivery & Read Tracking',
      description: 'Track message delivery, open rates, and click-through rates for every campaign',
      details: 'Real-time dashboard showing who received, opened, and clicked - optimize future campaigns with data'
    }
  ];

  const benefits = [
    '80% Better Engagement vs generic messages',
    '50% Cost Savings with automated campaigns',
    'Save 10+ Hours/Week on manual messaging',
    '3X Higher Response Rate with personalization',
    'Zero Missed Communications with automation',
    'Professional Brand Image with templates',
    'Instant Customer Reach via WhatsApp',
    'Payment Collection 2X Faster with reminders',
    'Real-time Delivery Tracking & Analytics',
    'Multi-Channel Strategy - WhatsApp + SMS + Email'
  ];

  const useCases = [
    {
      scenario: 'Payment Reminder',
      before: 'Staff manually calls 50 customers daily about pending payments - takes 3 hours',
      after: 'Automated WhatsApp/SMS sent to all overdue customers at 10 AM - takes 2 minutes',
      impact: '⚡ 90X Faster'
    },
    {
      scenario: 'Site Visit Confirmation',
      before: 'Agent calls each customer day before visit - 30% don\'t pick up, 15% forget',
      after: 'Automated WhatsApp/SMS day before + 2 hours before visit with location map',
      impact: '✅ 95% Attendance'
    },
    {
      scenario: 'New Project Launch',
      before: 'Staff sends 200 manual WhatsApp messages over 2 days - typos, inconsistent info',
      after: 'Bulk WhatsApp to 5000 filtered leads in 10 minutes - perfect consistency',
      impact: '🎯 25X Reach'
    },
    {
      scenario: 'Booking Confirmation',
      before: 'Print receipt, manually SMS/WhatsApp - sometimes forgotten, looks unprofessional',
      after: 'Instant automated email + WhatsApp with professional receipt PDF, payment breakdown',
      impact: '🌟 Pro Image'
    }
  ];

  const integrations = [
    { name: 'WhatsApp Business API', status: 'Ready to integrate', cost: 'Pay per message (₹0.30-0.50)' },
    { name: 'SMS Gateway (MSG91/Twilio)', status: 'Ready to integrate', cost: 'Pay per SMS (₹0.15-0.25)' },
    { name: 'Email (SMTP/SendGrid)', status: 'Built-in support', cost: 'Free up to 10k/month' },
    { name: 'Exotel/Knowlarity (Calls)', status: 'Can be integrated', cost: 'Optional add-on' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      
      {/* Hero Section */}
      <div className="pt-24 pb-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white hover:text-gray-200 mb-8">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>

          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Omni-Channel Communication Hub
            </h1>
            <p className="text-2xl text-white/90 mb-8">
              Automate WhatsApp, SMS, and Email campaigns. Reach 1000s of customers in minutes with personalized messages. Get 80% better engagement and save 10+ hours every week.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                📱 WhatsApp + SMS + Email
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                ⚡ 10 Min Setup
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                💰 50% Cost Savings
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem vs Solution */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
              Stop Wasting Time on Manual Messaging
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-red-50 p-6 rounded-xl border-l-4 border-red-500">
                <h3 className="text-xl font-bold text-red-700 mb-4">Manual Process Pain</h3>
                <ul className="space-y-3 text-gray-700">
                  <li>❌ Staff spends 3+ hours daily on follow-up calls/messages</li>
                  <li>❌ Generic messages get 20% response rate</li>
                  <li>❌ Inconsistent communication quality</li>
                  <li>❌ Miss sending important payment reminders</li>
                  <li>❌ High SMS/Email costs with manual tools</li>
                  <li>❌ No tracking - don't know who received/read</li>
                </ul>
              </div>
              <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-500">
                <h3 className="text-xl font-bold text-green-700 mb-4">MemoraAI Automation</h3>
                <ul className="space-y-3 text-gray-700">
                  <li>✅ Automated campaigns - 2 minutes to reach 1000s</li>
                  <li>✅ Personalized messages get 60%+ response rate</li>
                  <li>✅ Professional templates every time</li>
                  <li>✅ Auto-trigger on events (booking, payment, etc.)</li>
                  <li>✅ 50% cost savings with bulk rates</li>
                  <li>✅ Complete delivery & engagement tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
              Complete Communication Toolkit
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12">
              Everything you need to engage customers professionally
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                  <div className="text-blue-600 mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    {feature.description}
                  </p>
                  <p className="text-sm text-gray-500 italic">
                    {feature.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real Use Cases */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Real Scenarios - Before & After
            </h2>
            <div className="space-y-6">
              {useCases.map((useCase, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-50 to-cyan-50 p-8 rounded-xl border-l-4 border-blue-500">
                  <h3 className="text-2xl font-bold text-blue-900 mb-4">
                    {useCase.scenario}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-2">❌ Before MemoraAI</p>
                      <p className="text-gray-700">{useCase.before}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-2">✅ After MemoraAI</p>
                      <p className="text-gray-700">{useCase.after}</p>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-center w-full">
                        {useCase.impact}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="py-16 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Why MemoraAI Communication Works
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <p className="text-lg text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Integration Options */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Integration Options
            </h2>
            <div className="space-y-4">
              {integrations.map((integration, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{integration.name}</h3>
                    <p className="text-gray-600">{integration.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600 font-semibold">{integration.cost}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-blue-50 p-6 rounded-xl border-l-4 border-blue-500">
              <p className="text-gray-700">
                <strong>💡 Pro Tip:</strong> Start with email (free), then add SMS for urgent messages, and WhatsApp for highest engagement. We'll help you get API credentials and set up in 10 minutes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Automate Your Customer Communication?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join 500+ real estate businesses saving 10+ hours per week with automated messaging
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
              >
                Start Free Trial
              </Link>
              <a
                href="#enquiry"
                className="bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-800 transition-all transform hover:scale-105 shadow-xl border-2 border-white"
              >
                See Demo
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Enquiry Form */}
      <div id="enquiry" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
              Get Communication Automation Setup
            </h2>
            <p className="text-center text-gray-600 mb-8">
              We'll help you integrate WhatsApp, SMS, and Email - all configured in 10 minutes
            </p>
            <EnquiryForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationSolution;