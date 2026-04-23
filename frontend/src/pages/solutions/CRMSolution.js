import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Users, Target, TrendingUp, Bell, BarChart } from 'lucide-react';
import EnquiryForm from '../../components/EnquiryForm';
import StickyNavbar from '../../components/StickyNavbar';

const CRMSolution = () => {
  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Smart Lead Capture',
      description: 'Automatically capture leads from website, WhatsApp, calls, and walk-ins with source tracking'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Intelligent Assignment',
      description: 'Auto-assign leads to team members based on location, property type, or custom rules'
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Follow-up Automation',
      description: 'Never miss a follow-up with smart reminders and automated scheduling'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Lead Scoring',
      description: 'AI-powered lead quality scoring helps prioritize high-value opportunities'
    },
    {
      icon: <BarChart className="w-8 h-8" />,
      title: 'Conversion Tracking',
      description: 'Track every stage from inquiry to booking with detailed analytics'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Team Collaboration',
      description: 'Share notes, activities, and updates across your team in real-time'
    }
  ];

  const benefits = [
    '0% Lead Leakage - Never lose a potential customer',
    '40X Faster Response Time with instant notifications',
    '300% Higher Conversion Rate with smart follow-ups',
    'Save 15+ Hours/Week on manual lead management',
    'Complete Lead Journey Visibility from inquiry to sale',
    'WhatsApp Integration for instant customer engagement'
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
              Smart CRM & Lead Management
            </h1>
            <p className="text-2xl text-white/90 mb-8">
              Stop losing 30-40% of your leads. MemoraAI's intelligent CRM ensures 0% leakage with automated follow-ups and smart assignment.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                🚀 40X Faster Growth
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                ✅ 0% Lead Leakage
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold">
                📈 300% Higher Conversions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-12">
            {/* Problem Statement */}
            <section className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                The Problem: Losing Leads = Losing Revenue
              </h2>
              <div className="space-y-4 text-gray-700">
                <p className="text-lg">
                  Most real estate companies lose 30-40% of their leads due to:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">❌</span>
                    <span>Manual lead entry leading to data loss and delays</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">❌</span>
                    <span>Forgotten follow-ups and missed opportunities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">❌</span>
                    <span>Poor lead distribution causing team conflicts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">❌</span>
                    <span>No visibility into lead status and team performance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-3 mt-1">❌</span>
                    <span>Leads falling through cracks during handoffs</span>
                  </li>
                </ul>
                <p className="text-xl font-semibold text-red-600 mt-6">
                  Result: Millions in lost revenue every year
                </p>
              </div>
            </section>

            {/* Solution */}
            <section className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                The Solution: MemoraAI Smart CRM
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                Our intelligent CRM system eliminates lead leakage and accelerates conversions with automation and smart workflows.
              </p>
              
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

            {/* Key Benefits */}
            <section className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Key Benefits
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* How It Works */}
            <section className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                How It Works
              </h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Automatic Lead Capture</h3>
                    <p className="text-gray-700">Leads from website forms, WhatsApp, calls, and walk-ins are instantly captured with complete details and source tracking.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Smart Assignment</h3>
                    <p className="text-gray-700">AI-powered rules instantly assign leads to the right team member based on location, property interest, or availability.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Automated Follow-ups</h3>
                    <p className="text-gray-700">System sends WhatsApp reminders to team members ensuring timely follow-ups and zero missed opportunities.</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Track & Convert</h3>
                    <p className="text-gray-700">Monitor every interaction, track conversion stages, and get real-time analytics on team performance.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ROI Calculator */}
            <section className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Calculate Your ROI
              </h2>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-6">
                  <p className="text-gray-700 mb-2">If you receive <strong>100 leads/month</strong> and lose 40% due to poor follow-up:</p>
                  <ul className="space-y-2 text-gray-700">
                    <li>❌ <strong>40 leads lost</strong> every month</li>
                    <li>❌ <strong>480 leads lost</strong> annually</li>
                    <li>❌ At ₹50,000 average commission: <strong className="text-red-600">₹2.4 Crore lost revenue/year</strong></li>
                  </ul>
                </div>
                <div className="bg-green-600 text-white rounded-lg p-6">
                  <p className="text-xl font-bold mb-2">With MemoraAI CRM:</p>
                  <ul className="space-y-2">
                    <li>✅ 0% lead leakage = <strong>480 additional leads captured</strong></li>
                    <li>✅ 30% conversion rate = <strong>144 additional sales</strong></li>
                    <li>✅ <strong className="text-2xl">₹7.2 Crore additional revenue!</strong></li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Right Sidebar - Enquiry Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <EnquiryForm solutionName="Smart CRM & Lead Management" />
              
              {/* Trust Badges */}
              <div className="mt-8 bg-white rounded-xl shadow-md p-6">
                <h3 className="font-bold text-gray-900 mb-4 text-center">
                  Trusted by 500+ Real Estate Companies
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span>99.9% Uptime Guarantee</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span>24×7 Support</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span>Free Training & Onboarding</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span>7-Day Money Back Guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMSolution;
