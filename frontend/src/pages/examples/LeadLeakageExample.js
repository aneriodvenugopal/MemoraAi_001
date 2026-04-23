import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, Check, TrendingUp, AlertTriangle } from 'lucide-react';
import StickyNavbar from '../../components/StickyNavbar';

const LeadLeakageExample = () => {
  const beforeScenario = {
    title: "Without RealApex - Traditional Process",
    problems: [
      { icon: "📞", issue: "Customer calls, receptionist writes on paper" },
      { icon: "⏰", issue: "Paper sits on desk for 2 hours" },
      { icon: "📝", issue: "Manager manually enters into Excel" },
      { icon: "❓", issue: "Agent doesn't know lead exists" },
      { icon: "⏳", issue: "3 days pass - no follow-up" },
      { icon: "📉", issue: "Customer already bought from competitor" }
    ],
    metrics: [
      { label: "Lead Capture Time", value: "2-4 hours", bad: true },
      { label: "Agent Response Time", value: "3-5 days", bad: true },
      { label: "Leads Lost", value: "40%", bad: true },
      { label: "Manual Work", value: "15 hrs/week", bad: true }
    ],
    realStory: {
      company: "ABC Developers, Hyderabad",
      quote: "We were losing 60-70 leads per month. By the time our agents followed up, customers had already visited competitors."
    }
  };

  const afterScenario = {
    title: "With RealApex - Automated Process",
    solutions: [
      { icon: "📱", solution: "Customer calls, system auto-captures details" },
      { icon: "⚡", solution: "Lead instantly assigned to nearest agent" },
      { icon: "🔔", solution: "Agent gets WhatsApp notification in 5 seconds" },
      { icon: "📞", solution: "Agent calls within 2 minutes" },
      { icon: "📊", solution: "Smart reminders ensure zero missed follow-ups" },
      { icon: "✅", solution: "Customer books - commission tracked automatically" }
    ],
    metrics: [
      { label: "Lead Capture Time", value: "5 seconds", good: true },
      { label: "Agent Response Time", value: "2 minutes", good: true },
      { label: "Leads Lost", value: "0%", good: true },
      { label: "Manual Work", value: "0 hrs/week", good: true }
    ],
    realStory: {
      company: "ABC Developers After RealApex",
      quote: "We now capture 100% of leads. Our conversion rate jumped from 18% to 45%. Zero leakage, zero manual work!"
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StickyNavbar />
      
      <div className="pt-24 pb-16 bg-gradient-to-r from-red-600 to-orange-600">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-white hover:text-gray-200 mb-8">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          
          <div className="max-w-5xl mx-auto text-center text-white">
            <AlertTriangle className="w-20 h-20 mx-auto mb-6 animate-bounce" />
            <h1 className="text-5xl font-bold mb-6">
              The 40% Lead Leakage Problem
            </h1>
            <p className="text-2xl mb-4">
              See exactly how traditional real estate companies lose millions in revenue
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 inline-block">
              <p className="text-3xl font-bold">₹2.4 Crores</p>
              <p className="text-lg opacity-90">Average annual loss for 100 leads/month company</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          
          {/* BEFORE */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-red-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">{beforeScenario.title}</h2>
              <X className="w-12 h-12 text-red-500" />
            </div>

            <div className="space-y-4 mb-8">
              {beforeScenario.problems.map((item, index) => (
                <div key={index} className="flex items-start bg-red-50 p-4 rounded-lg">
                  <span className="text-3xl mr-4">{item.icon}</span>
                  <div>
                    <p className="text-gray-800 font-medium">{item.issue}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-red-200 pt-6">
              <h3 className="font-bold text-xl text-gray-900 mb-4">The Numbers:</h3>
              <div className="grid grid-cols-2 gap-4">
                {beforeScenario.metrics.map((metric, index) => (
                  <div key={index} className="bg-red-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold text-red-600">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 italic mb-2">"{beforeScenario.realStory.quote}"</p>
              <p className="text-sm text-gray-600 font-semibold">- {beforeScenario.realStory.company}</p>
            </div>
          </div>

          {/* AFTER */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-green-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">{afterScenario.title}</h2>
              <Check className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-4 mb-8">
              {afterScenario.solutions.map((item, index) => (
                <div key={index} className="flex items-start bg-green-50 p-4 rounded-lg">
                  <span className="text-3xl mr-4">{item.icon}</span>
                  <div>
                    <p className="text-gray-800 font-medium">{item.solution}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-green-200 pt-6">
              <h3 className="font-bold text-xl text-gray-900 mb-4">The Results:</h3>
              <div className="grid grid-cols-2 gap-4">
                {afterScenario.metrics.map((metric, index) => (
                  <div key={index} className="bg-green-100 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold text-green-600">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 italic mb-2">"{afterScenario.realStory.quote}"</p>
              <p className="text-sm text-gray-600 font-semibold">- {afterScenario.realStory.company}</p>
            </div>
          </div>
        </div>

        {/* ROI Impact */}
        <div className="mt-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-12 text-white text-center max-w-5xl mx-auto">
          <TrendingUp className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6">The Financial Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-5xl font-bold mb-2">40</p>
              <p className="text-xl">Extra Leads Captured/Month</p>
            </div>
            <div>
              <p className="text-5xl font-bold mb-2">144</p>
              <p className="text-xl">Additional Sales/Year</p>
            </div>
            <div>
              <p className="text-5xl font-bold mb-2">₹7.2 Cr</p>
              <p className="text-xl">Additional Revenue</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            Stop Losing Leads Today
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            See how RealApex can eliminate your lead leakage in just 1 day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/919948303060?text=I want to stop lead leakage with RealApex!"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl"
            >
              💬 Chat on WhatsApp
            </a>
            <a
              href="tel:+919948303060"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl"
            >
              📞 Call Now
            </a>
            <Link
              to="/solutions/crm"
              className="inline-block bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-xl font-bold text-lg transition-all"
            >
              Learn More About CRM →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadLeakageExample;
