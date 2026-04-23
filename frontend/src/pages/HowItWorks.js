import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Smartphone, RefreshCw, TrendingUp, DollarSign, Share2, Play } from 'lucide-react';
import StickyNavbar from '../../components/StickyNavbar';
import DemoRequestForm from '../../components/DemoRequestForm';

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <StickyNavbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              How MemoraAI Works
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A Complete Real Estate Ecosystem - From Lead to Customer to Resale
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-7xl mx-auto">
          
          {/* Left Side - Ecosystem Flow */}
          <div className="lg:col-span-3">
            
            {/* Partnership Badge */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-white mb-8 text-center">
              <h2 className="text-3xl font-bold mb-4">MemoraAI + IncomeLands Partnership</h2>
              <p className="text-lg opacity-90">
                MemoraAI is the <strong>Technical Partner</strong> powering IncomeLands' complete ecosystem
              </p>
            </div>

            {/* Ecosystem Flow */}
            <div className="space-y-6">
              
              {/* Step 1: Lead Generation */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-red-500">
                <div className="flex items-center mb-4">
                  <div className="bg-red-100 rounded-full p-4 mr-4">
                    <Users className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">1. Lead Generation</h3>
                    <p className="text-gray-600">Multi-channel customer acquisition</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <Play className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">YouTube</p>
                    <p className="text-xs text-gray-600">Video ads</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <Share2 className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Social Media</p>
                    <p className="text-xs text-gray-600">FB, Instagram</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <Smartphone className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">IncomeLands App</p>
                    <p className="text-xs text-gray-600">Direct search</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <Users className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Referrals</p>
                    <p className="text-xs text-gray-600">Word of mouth</p>
                  </div>
                </div>
                
                <div className="mt-4 bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-800">
                    ✅ Every lead from every channel automatically captured in MemoraAI<br/>
                    ✅ Source tracking - know which platform brought the customer<br/>
                    ✅ Zero manual entry - complete automation
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-12 h-12 text-gray-400 animate-bounce" style={{transform: 'rotate(90deg)'}} />
              </div>

              {/* Step 2: Customer Management */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 rounded-full p-4 mr-4">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">2. Customer Conversion</h3>
                    <p className="text-gray-600">Smart CRM converts leads to customers</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-semibold text-blue-900">📞 Instant Follow-up</p>
                    <p className="text-sm text-blue-800">Agent gets WhatsApp notification within 5 seconds → Calls within 2 minutes</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-semibold text-blue-900">🗺️ Visual Property Maps</p>
                    <p className="text-sm text-blue-800">Show interactive layouts → Customer selects plot → Instant booking</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-semibold text-blue-900">💳 Online Payments</p>
                    <p className="text-sm text-blue-800">Send payment link via WhatsApp → Customer pays instantly → Receipt auto-generated</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-12 h-12 text-gray-400 animate-bounce" style={{transform: 'rotate(90deg)'}} />
              </div>

              {/* Step 3: Customer Portal */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 rounded-full p-4 mr-4">
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">3. Customer Experience</h3>
                    <p className="text-gray-600">Portal + WhatsApp = Happy customers</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">✅ Login to customer portal</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">✅ View booking details</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">✅ Track payments</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">✅ Download documents</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">✅ Construction updates</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">✅ WhatsApp support 24×7</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-12 h-12 text-gray-400 animate-bounce" style={{transform: 'rotate(90deg)'}} />
              </div>

              {/* Step 4: Resale & Repeat */}
              <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 rounded-full p-4 mr-4">
                    <RefreshCw className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">4. Resale & Referral Loop</h3>
                    <p className="text-gray-600">Lifetime customer value maximization</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="font-semibold text-purple-900">🔄 Resale Marketplace</p>
                    <p className="text-sm text-purple-800">Customer wants to sell → List on platform → New buyer found → Commission earned</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="font-semibold text-purple-900">👥 Referral System</p>
                    <p className="text-sm text-purple-800">Happy customer refers friends → Automated rewards → More sales → Growth cycle</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="font-semibold text-purple-900">🏗️ New Projects</p>
                    <p className="text-sm text-purple-800">Launch new project → Alert existing customers → Repeat purchases → 40% more business</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-12 h-12 text-gray-400 animate-bounce" style={{transform: 'rotate(90deg)'}} />
              </div>

              {/* Complete Ecosystem Result */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
                <div className="flex items-center mb-6">
                  <DollarSign className="w-12 h-12 mr-4" />
                  <h3 className="text-3xl font-bold">Complete Ecosystem Result</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-4xl font-bold mb-2">40X</p>
                    <p className="text-lg">Faster Growth</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold mb-2">0%</p>
                    <p className="text-lg">Lead Leakage</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold mb-2">25%</p>
                    <p className="text-lg">Additional Revenue</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side - Demo Request Form */}
          <div className="lg:col-span-2">
            <DemoRequestForm 
              demoType="Complete MemoraAI Ecosystem"
              description="See live how the complete ecosystem works - from YouTube ads to customer conversion to resale. 30-minute personalized demo."
            />
            
            {/* Why This Works */}
            <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
              <h3 className="font-bold text-xl text-gray-900 mb-4">Why This Ecosystem Works</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700"><strong>No Leakage:</strong> Every lead captured automatically</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Fast Response:</strong> 2-minute agent response time</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Happy Customers:</strong> Portal + WhatsApp support</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Lifetime Value:</strong> Resale + referrals = more revenue</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Complete Automation:</strong> Zero manual work</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
