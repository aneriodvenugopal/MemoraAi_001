import React, { useState } from 'react';
import { Building2, Users, UserCheck, Briefcase, ChevronRight, Check } from 'lucide-react';

const WhoBenefits = () => {
  const [activeTab, setActiveTab] = useState('company');

  const beneficiaries = {
    company: {
      icon: <Building2 className="w-12 h-12" />,
      title: "Real Estate Companies",
      tagline: "Complete Business Automation",
      color: "blue",
      benefits: [
        {
          category: "Revenue Growth",
          items: [
            "40X faster business growth with zero lead leakage",
            "15-25% additional revenue from resale marketplace",
            "60% faster payment collection = better cash flow",
            "Automated commission calculations = no disputes"
          ]
        },
        {
          category: "Operational Efficiency",
          items: [
            "Save 20+ hours/week on manual tasks",
            "Real-time dashboards for instant decision making",
            "Automated SMS/Email/WhatsApp = 80% better engagement",
            "All data in one place - no more spreadsheets"
          ]
        },
        {
          category: "Team Management",
          items: [
            "Track every agent's performance in real-time",
            "Transparent commission tracking prevents conflicts",
            "Role-based access control for security",
            "Mobile app for team to work from anywhere"
          ]
        },
        {
          category: "Customer Experience",
          items: [
            "Interactive property maps = 3X higher conversions",
            "Instant payment links via WhatsApp",
            "Customer portal for bookings & documents",
            "FREE 24×7 Expert Advisory for customers"
          ]
        }
      ]
    },
    customers: {
      icon: <Users className="w-12 h-12" />,
      title: "Your Customers (Buyers)",
      tagline: "Seamless Property Buying Experience",
      color: "green",
      benefits: [
        {
          category: "Easy Property Search",
          items: [
            "Interactive visual property layouts - see exactly what you're buying",
            "Real-time availability - no disappointments",
            "Filter by budget, location, size instantly",
            "Virtual tours and 360° views"
          ]
        },
        {
          category: "Convenient Payments",
          items: [
            "Pay online via UPI, Cards, Net Banking",
            "Flexible EMI options available",
            "Instant payment receipts on WhatsApp",
            "Track all payments in customer portal"
          ]
        },
        {
          category: "Complete Transparency",
          items: [
            "Login to customer portal anytime",
            "Download booking documents instantly",
            "Track construction progress",
            "View all payment history & pending amounts"
          ]
        },
        {
          category: "FREE Expert Support",
          items: [
            "FREE 24×7 Expert Advisory for budget & location guidance",
            "WhatsApp support for instant queries",
            "Multi-language support (Telugu, Hindi, English)",
            "Get market insights & investment advice"
          ]
        }
      ]
    },
    agents: {
      icon: <UserCheck className="w-12 h-12" />,
      title: "Your Agents & Sales Team",
      tagline: "Sell More, Earn More",
      color: "purple",
      benefits: [
        {
          category: "Lead Management",
          items: [
            "Get leads instantly on mobile - no delays",
            "Smart follow-up reminders - never miss opportunities",
            "Lead scoring shows which leads to prioritize",
            "WhatsApp integration for instant customer contact"
          ]
        },
        {
          category: "Mobile-First Tools",
          items: [
            "Complete CRM on mobile - work from anywhere",
            "Show interactive property maps to customers",
            "Generate instant quotations on the spot",
            "Share payment links via WhatsApp immediately"
          ]
        },
        {
          category: "Commission Transparency",
          items: [
            "View your earnings in real-time",
            "Track commission status - approved/pending/paid",
            "Auto-calculated based on your sales",
            "Complete payment history with receipts"
          ]
        },
        {
          category: "Performance Tracking",
          items: [
            "See your monthly/quarterly targets",
            "Compare your performance with team",
            "Get rewarded for referrals",
            "Access to all property documents instantly"
          ]
        }
      ]
    },
    staff: {
      icon: <Briefcase className="w-12 h-12" />,
      title: "Your Staff & Back Office",
      tagline: "Simplified Daily Operations",
      color: "orange",
      benefits: [
        {
          category: "Automated Workflows",
          items: [
            "No manual data entry - everything auto-captured",
            "Auto-generated receipts, invoices, agreements",
            "Bulk SMS/Email with one click",
            "Automated payment reminders save hours"
          ]
        },
        {
          category: "Billing & Accounting",
          items: [
            "Generate invoices instantly",
            "Track all payments & outstanding amounts",
            "GST-compliant billing",
            "Export to Tally/other accounting software"
          ]
        },
        {
          category: "Reports & Analytics",
          items: [
            "Sales reports ready in 2 clicks",
            "Commission reports auto-generated",
            "Collection reports with pending follow-ups",
            "Custom reports - filter by date, project, agent"
          ]
        },
        {
          category: "Access Control",
          items: [
            "Secure login for each staff member",
            "Role-based permissions (can only see what they should)",
            "Audit trail - track who did what",
            "Change passwords anytime for security"
          ]
        }
      ]
    }
  };

  const active = beneficiaries[activeTab];
  const colorClasses = {
    blue: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-700', border: 'border-blue-600' },
    green: { bg: 'bg-green-600', light: 'bg-green-50', text: 'text-green-600', hover: 'hover:bg-green-700', border: 'border-green-600' },
    purple: { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-700', border: 'border-purple-600' },
    orange: { bg: 'bg-orange-600', light: 'bg-orange-50', text: 'text-orange-600', hover: 'hover:bg-orange-700', border: 'border-orange-600' }
  };
  const colors = colorClasses[active.color];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Who Benefits from MemoraAI?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A complete ecosystem that benefits everyone - from business owners to customers
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-5xl mx-auto mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(beneficiaries).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  activeTab === key
                    ? `${colorClasses[value.color].bg} text-white border-transparent shadow-lg transform scale-105`
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className={`flex justify-center mb-3 ${activeTab === key ? 'text-white' : colorClasses[value.color].text}`}>
                  {value.icon}
                </div>
                <div className="font-bold text-center">{value.title.split(' ').slice(-1)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto">
          <div className={`bg-${active.color}-50/30 rounded-2xl p-8 md:p-12 border border-${active.color}-100`}>
            {/* Header */}
            <div className="flex items-center mb-8">
              <div className={`${colors.bg} text-white p-4 rounded-xl mr-6`}>
                {active.icon}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{active.title}</h3>
                <p className={`text-xl ${colors.text} font-semibold`}>{active.tagline}</p>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {active.benefits.map((benefit, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-md">
                  <h4 className={`text-xl font-bold ${colors.text} mb-4 flex items-center`}>
                    <ChevronRight className="w-5 h-5 mr-2" />
                    {benefit.category}
                  </h4>
                  <ul className="space-y-3">
                    {benefit.items.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className={`w-5 h-5 ${colors.text} mr-2 flex-shrink-0 mt-0.5`} />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 text-center">
              <a
                href="https://wa.me/919948303060?text=I want to learn more about how MemoraAI benefits everyone in my organization!"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-block ${colors.bg} ${colors.hover} text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl`}
              >
                See It In Action - Book Free Demo →
              </a>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">🏢</div>
            <div className="font-bold mb-1">Companies</div>
            <div className="text-sm opacity-90">40X Faster Growth</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">👥</div>
            <div className="font-bold mb-1">Customers</div>
            <div className="text-sm opacity-90">Seamless Experience</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <div className="font-bold mb-1">Agents</div>
            <div className="text-sm opacity-90">Sell More, Earn More</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-orange-600 text-white rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">💼</div>
            <div className="font-bold mb-1">Staff</div>
            <div className="text-sm opacity-90">Work Smarter</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhoBenefits;
