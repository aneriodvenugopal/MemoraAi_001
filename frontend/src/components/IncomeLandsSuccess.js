import React from 'react';
import { TrendingUp, Users, Globe, Award, CheckCircle, Target, Database, MapPin } from 'lucide-react';

const IncomeLandsSuccess = () => {
  return (
    <div className="py-16 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full mb-4 shadow-lg">
              <Award className="w-5 h-5" />
              <span className="font-bold">Proven Track Record</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              IncomeLands.in: Our Successful Lead Generation Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Before building MemoraAI, we built <strong>IncomeLands.in</strong> - a property listing blog that generated <strong>1000+ leads</strong> and reached <strong>72K+ people globally</strong>. Here's the proof we understand real estate lead generation!
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-green-300 text-center transform hover:scale-105 transition-all">
              <div className="text-5xl font-bold text-green-600 mb-2">72K+</div>
              <div className="text-gray-700 font-semibold">Global Reach</div>
              <div className="text-xs text-gray-600 mt-1">Lifetime Views</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-300 text-center transform hover:scale-105 transition-all">
              <div className="text-5xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-gray-700 font-semibold">Leads Generated</div>
              <div className="text-xs text-gray-600 mt-1">Quality Inquiries</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-300 text-center transform hover:scale-105 transition-all">
              <div className="text-5xl font-bold text-purple-600 mb-2">1000+</div>
              <div className="text-gray-700 font-semibold">NRI Database</div>
              <div className="text-xs text-gray-600 mt-1">Customer Bank</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-300 text-center transform hover:scale-105 transition-all">
              <div className="text-5xl font-bold text-orange-600 mb-2">50+</div>
              <div className="text-gray-700 font-semibold">Agent Network</div>
              <div className="text-xs text-gray-600 mt-1">Support System</div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Left: Success Story */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-7 h-7 text-green-600" />
                IncomeLands Success Story
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">Blog Platform for Property Listings</p>
                    <p className="text-sm text-gray-600">Built and managed IncomeLands.in - a property blog reaching global audiences</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">72K+ Global Reach</p>
                    <p className="text-sm text-gray-600">Peak: 8,348 views in single month (Sep 2023) • Google is #1 traffic source</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">1000+ Quality Leads Generated</p>
                    <p className="text-sm text-gray-600">Real inquiries from genuine buyers across India and globally</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">Good Number of Successful Sales</p>
                    <p className="text-sm text-gray-600">Converted leads into actual property transactions</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-bold text-gray-900">International NRI Market Expertise</p>
                    <p className="text-sm text-gray-600">1000+ NRI customers in database • Traffic from USA, Singapore, Germany</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Property Types & Reach */}
            <div className="space-y-6">
              {/* Property Types */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 shadow-xl text-white">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Target className="w-7 h-7" />
                  Property Types Sold
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                    <p className="font-bold">🏘️ Plots</p>
                    <p className="text-xs">Residential Plots</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                    <p className="font-bold">🏢 Flats</p>
                    <p className="text-xs">Apartment Units</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                    <p className="font-bold">🏡 Independent Houses</p>
                    <p className="text-xs">Gated Projects</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                    <p className="font-bold">🌾 Farm Lands</p>
                    <p className="text-xs">Agriculture Lands</p>
                  </div>
                </div>
              </div>

              {/* Global Reach */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-7 h-7 text-blue-600" />
                  Global Audience Reach
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold text-gray-700">India</span>
                    </div>
                    <span className="text-gray-900 font-bold">23.9K views</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-gray-700">United States</span>
                    </div>
                    <span className="text-gray-900 font-bold">18.6K views</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="font-semibold text-gray-700">Singapore</span>
                    </div>
                    <span className="text-gray-900 font-bold">7.95K views</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="font-semibold text-gray-700">Germany & Others</span>
                    </div>
                    <span className="text-gray-900 font-bold">21.6K views</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Why This Matters */}
          <div className="bg-gradient-to-r from-indigo-500 to-red-500 rounded-2xl p-8 text-white shadow-2xl">
            <h3 className="text-3xl font-bold mb-6 text-center">Why This Proves Our Real Estate Expertise</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-5xl mb-3">🎯</div>
                <h4 className="font-bold text-xl mb-2">Lead Generation Mastery</h4>
                <p className="text-white/90 text-sm">
                  We didn't just build software - we USED it ourselves to generate 1000+ real estate leads. We know what works!
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">💰</div>
                <h4 className="font-bold text-xl mb-2">Proven Sales Conversions</h4>
                <p className="text-white/90 text-sm">
                  Generated leads, closed sales. We understand the complete real estate sales funnel from inquiry to closing.
                </p>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">🌏</div>
                <h4 className="font-bold text-xl mb-2">NRI Market Expertise</h4>
                <p className="text-white/90 text-sm">
                  1000+ NRI customer database. We understand overseas buyers - their needs, concerns, and buying patterns.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-xl p-8 shadow-lg inline-block">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                We Built Lead Gen Success, Now We Help YOU Build Yours
              </h3>
              <p className="text-gray-700 mb-6 max-w-2xl">
                IncomeLands taught us what real estate businesses need. MemoraAI is the result of that real-world experience - built to help YOU generate leads, manage projects, and close more sales.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/register"
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Your Free Trial
                </a>
                <a
                  href="/contact"
                  className="px-8 py-4 bg-white border-2 border-green-600 text-green-600 hover:bg-green-50 font-bold rounded-lg transition-all"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeLandsSuccess;
