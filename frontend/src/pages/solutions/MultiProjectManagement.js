import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Building2, BarChart3, CreditCard, Layout, Users, TrendingUp, Bell, FileText, Target, Zap } from 'lucide-react';
import EnquiryForm from '../../components/EnquiryForm';
import StickyNavbar from '../../components/StickyNavbar';

const MultiProjectManagement = () => {
  const features = [
    {
      icon: <Building2 className="w-8 h-8" />,
      title: 'Unified Project Dashboard',
      description: 'View all your projects in one place - track status, leads, bookings, and revenue across every development'
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Automated Reports',
      description: 'System generates daily, weekly, and monthly reports for each project - sales, collection, inventory status'
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: 'Payment Tracking',
      description: 'Track payments across all projects automatically - overdue alerts, collection forecasts, commission calculations'
    },
    {
      icon: <Layout className="w-8 h-8" />,
      title: 'Layout Visualizations',
      description: 'Interactive property layouts for every project with real-time availability and color-coded status'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Lead Management',
      description: 'Manage leads for multiple projects seamlessly - auto-assign, track conversions, and prevent leakage'
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Smart Follow-ups',
      description: 'Automated follow-up reminders for every project - never miss a potential customer across any development'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Cross-Project Analytics',
      description: 'Compare performance metrics across all projects - identify best performers and optimization opportunities'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Document Management',
      description: 'Store and access project documents, agreements, and layouts for all projects in one secure location'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Revenue Forecasting',
      description: 'AI-powered revenue predictions for each project based on booking velocity and payment schedules'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'One-Click Switching',
      description: 'Switch between projects instantly without losing context - all data at your fingertips'
    }
  ];

  const benefits = [
    'Manage 10+ projects simultaneously without confusion',
    'Save 20+ hours per week on manual project coordination',
    'Zero context switching - all project data in one system',
    'Automated consolidation of reports across projects',
    'Real-time visibility into every project\'s performance',
    'Team collaboration across multiple developments',
    'Centralized payment tracking and collection',
    'Unified customer database across all projects',
    'Cross-project lead referrals and optimization',
    'Single platform for marketing, sales, and operations'
  ];

  const useCases = [
    {
      title: 'Real Estate Developers',
      description: 'Managing 5-10 ongoing projects across different locations',
      result: 'Reduced project management time by 70%'
    },
    {
      title: 'Channel Partners',
      description: 'Handling leads for 20+ developer projects simultaneously',
      result: 'Increased lead conversions by 45%'
    },
    {
      title: 'Real Estate Agencies',
      description: 'Multiple agents managing various projects and leads',
      result: 'Eliminated lead leakage and improved team efficiency'
    }
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
              Multi-Project Management Made Effortless
            </h1>
            <p className="text-2xl text-white/90 mb-8">
              Handle unlimited real estate projects simultaneously. System automatically manages reports, payments, layout visualizations, lead conversions, follow-ups, and much more.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                🏢 Manage 10+ Projects
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                ⚡ Save 20+ Hours/Week
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                📊 Unified Dashboard
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
              The Multi-Project Challenge
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-red-50 p-6 rounded-xl border-l-4 border-red-500">
                <h3 className="text-xl font-bold text-red-700 mb-4">Without MemoraAI</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>❌ Juggling multiple spreadsheets and tools</li>
                  <li>❌ Confusion between project data</li>
                  <li>❌ Manual report compilation taking hours</li>
                  <li>❌ Missed follow-ups across projects</li>
                  <li>❌ Payment tracking chaos</li>
                  <li>❌ No consolidated view of business</li>
                </ul>
              </div>
              <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-500">
                <h3 className="text-xl font-bold text-green-700 mb-4">With MemoraAI</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>✅ Single unified platform for all projects</li>
                  <li>✅ Clear project separation with easy switching</li>
                  <li>✅ Automated reports for every project</li>
                  <li>✅ Smart follow-ups across all developments</li>
                  <li>✅ Centralized payment tracking</li>
                  <li>✅ Real-time business insights</li>
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
              System Handles Everything Automatically
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12">
              Manage unlimited projects without the complexity
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
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Key Benefits
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <p className="text-lg text-gray-700">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="py-16 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              Who Benefits Most?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {useCases.map((useCase, index) => (
                <div key={index} className="bg-white p-8 rounded-xl shadow-lg">
                  <h3 className="text-2xl font-bold text-blue-600 mb-4">
                    {useCase.title}
                  </h3>
                  <p className="text-gray-700 mb-6">
                    {useCase.description}
                  </p>
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                    <p className="text-green-700 font-semibold">
                      {useCase.result}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
              How It Works
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Add Your Projects</h3>
                  <p className="text-gray-600">Create separate workspaces for each real estate project - apartments, villas, plots, commercial spaces</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">System Handles Everything</h3>
                  <p className="text-gray-600">MemoraAI automatically manages leads, follow-ups, payments, reports, and visualizations for each project</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Switch Seamlessly</h3>
                  <p className="text-gray-600">Jump between projects with one click - all data, leads, payments, and reports instantly accessible</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Get Consolidated Insights</h3>
                  <p className="text-gray-600">View aggregated performance across all projects - total revenue, conversions, inventory, and trends</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Manage Multiple Projects Effortlessly?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join 500+ real estate businesses managing unlimited projects with MemoraAI
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
              >
                Get Started Free
              </Link>
              <a
                href="#enquiry"
                className="bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-800 transition-all transform hover:scale-105 shadow-xl border-2 border-white"
              >
                Request Demo
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
              Get a Personalized Demo
            </h2>
            <p className="text-center text-gray-600 mb-8">
              See how MemoraAI can help you manage multiple projects seamlessly
            </p>
            <EnquiryForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiProjectManagement;
