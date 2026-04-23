import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Phone, Bell, Target, TrendingUp, CheckCircle, Zap } from 'lucide-react';
import StickyNavbar from '../../components/StickyNavbar';
import DemoRequestForm from '../../components/DemoRequestForm';

const CRMDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <StickyNavbar />
      
      <div className="pt-24 pb-8">
        <div className="container mx-auto px-6">
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-7xl mx-auto">
          
          {/* Left Side - Animated Explanation */}
          <div className="lg:col-span-3 space-y-8">
            <div className="text-center lg:text-left mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Smart CRM & Lead Management
              </h1>
              <p className="text-xl text-gray-600">
                See how MemoraAI captures 100% of leads and converts them 3X faster
              </p>
            </div>

            {/* Animated Process Steps */}
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500 transform hover:scale-105 transition-all animate-fadeIn">
                <div className="flex items-start">
                  <div className="bg-blue-100 rounded-full p-4 mr-6 animate-bounce">
                    <Phone className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      1. Quick Lead Entry
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Customer calls → Staff enters details in 30 seconds with source tracking form
                    </p>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        ✅ <strong>Quick form</strong> - Guided data entry<br/>
                        ✅ <strong>Source tracking</strong> - Select which ad/campaign<br/>
                        ✅ <strong>Complete details</strong> - Name, phone, budget, location
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500 transform hover:scale-105 transition-all animate-fadeIn" style={{animationDelay: '0.2s'}}>
                <div className="flex items-start">
                  <div className="bg-green-100 rounded-full p-4 mr-6 animate-pulse">
                    <Target className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      2. Smart Assignment
                    </h3>
                    <p className="text-gray-700 mb-3">
                      AI instantly assigns lead to nearest available agent based on location & expertise
                    </p>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✅ <strong>Location-based</strong> - Nearest agent gets it<br/>
                        ✅ <strong>Load balancing</strong> - Fair distribution<br/>
                        ✅ <strong>Expertise match</strong> - Right agent for right property
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500 transform hover:scale-105 transition-all animate-fadeIn" style={{animationDelay: '0.4s'}}>
                <div className="flex items-start">
                  <div className="bg-purple-100 rounded-full p-4 mr-6 animate-bounce">
                    <Bell className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      3. Instant Notifications
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Agent gets WhatsApp notification within 5 seconds with complete lead details
                    </p>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-sm text-purple-800">
                        ✅ <strong>WhatsApp alert</strong> - Can't miss it<br/>
                        ✅ <strong>Complete info</strong> - Customer details + requirements<br/>
                        ✅ <strong>One-tap call</strong> - Direct dial from notification
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500 transform hover:scale-105 transition-all animate-fadeIn" style={{animationDelay: '0.6s'}}>
                <div className="flex items-start">
                  <div className="bg-orange-100 rounded-full p-4 mr-6 animate-pulse">
                    <Zap className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      4. Lightning-Fast Response
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Agent calls customer within 2 minutes - before competitor even knows
                    </p>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-sm text-orange-800">
                        ✅ <strong>2-minute response</strong> - Industry fastest<br/>
                        ✅ <strong>First mover advantage</strong> - Beat competition<br/>
                        ✅ <strong>Customer impressed</strong> - Instant service
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-cyan-500 transform hover:scale-105 transition-all animate-fadeIn" style={{animationDelay: '0.8s'}}>
                <div className="flex items-start">
                  <div className="bg-cyan-100 rounded-full p-4 mr-6 animate-bounce">
                    <TrendingUp className="w-8 h-8 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      5. Smart Follow-ups
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Automated reminders ensure zero missed follow-ups with intelligent scheduling
                    </p>
                    <div className="bg-cyan-50 rounded-lg p-3">
                      <p className="text-sm text-cyan-800">
                        ✅ <strong>Auto-reminders</strong> - Never forget a follow-up<br/>
                        ✅ <strong>Smart timing</strong> - Call at best time<br/>
                        ✅ <strong>WhatsApp updates</strong> - Keep customer engaged
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 6 */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-600 transform hover:scale-105 transition-all animate-fadeIn" style={{animationDelay: '1s'}}>
                <div className="flex items-start">
                  <div className="bg-green-100 rounded-full p-4 mr-6 animate-pulse">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      6. Booking & Commission
                    </h3>
                    <p className="text-gray-700 mb-3">
                      Customer books → Commission auto-calculated and tracked transparently
                    </p>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        ✅ <strong>Auto-calculation</strong> - No manual work<br/>
                        ✅ <strong>Transparent tracking</strong> - Agent sees earnings<br/>
                        ✅ <strong>Zero disputes</strong> - Everything recorded
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Box */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
              <h3 className="text-3xl font-bold mb-6 text-center">The Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-5xl font-bold mb-2">0%</p>
                  <p className="text-lg">Lead Leakage</p>
                </div>
                <div>
                  <p className="text-5xl font-bold mb-2">3X</p>
                  <p className="text-lg">Faster Conversions</p>
                </div>
                <div>
                  <p className="text-5xl font-bold mb-2">40X</p>
                  <p className="text-lg">Business Growth</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Demo Form */}
          <div className="lg:col-span-2">
            <DemoRequestForm 
              demoType="Smart CRM & Lead Management"
              description="See live how we capture, assign, and convert leads in real-time. 30-minute personalized demo tailored to your business."
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CRMDemo;
