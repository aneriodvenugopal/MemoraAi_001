import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, Lightbulb, Rocket, CheckCircle, Building2, Code, Heart } from 'lucide-react';

const OurStory = () => {
  return (
    <div className="py-16 bg-gradient-to-br from-blue-900 via-purple-900 to-cyan-900">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-cyan-500/20 px-4 py-2 rounded-full mb-4">
              <Building2 className="w-5 h-5 text-cyan-300" />
              <span className="text-cyan-100 font-semibold">By Eloniot Software Solutions</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              The MemoraAI Story
            </h2>
            <p className="text-xl text-cyan-200">
              Born from Real Experience, Built for Real Estate Success
            </p>
          </div>

          {/* Journey Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-cyan-500/30"></div>

            {/* Phase 1 */}
            <div className="relative mb-12">
              <div className="md:flex items-center justify-between">
                <div className="md:w-5/12 mb-6 md:mb-0 md:text-right md:pr-12">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-cyan-500/30 hover:border-cyan-500 transition-all">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-500 rounded-full mb-4 md:float-right md:ml-4">
                      <Code className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Phase 1: The Beginning</h3>
                    <p className="text-cyan-100 leading-relaxed">
                      Started by developing <strong>custom real estate solutions</strong> for individual clients - CRM modules, property websites, and mobile apps like <strong>IncomeLands</strong>. Created dozens of <strong>interactive property layouts</strong> and management systems tailored to each client's needs.
                    </p>
                  </div>
                </div>
                <div className="hidden md:block md:w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-cyan-500 rounded-full border-4 border-purple-900 z-10"></div>
                </div>
                <div className="md:w-5/12"></div>
              </div>
            </div>

            {/* Phase 2 */}
            <div className="relative mb-12">
              <div className="md:flex items-center justify-between">
                <div className="md:w-5/12"></div>
                <div className="hidden md:block md:w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-cyan-500 rounded-full border-4 border-purple-900 z-10"></div>
                </div>
                <div className="md:w-5/12 mb-6 md:mb-0 md:pl-12">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-cyan-500/30 hover:border-cyan-500 transition-all">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-full mb-4">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Phase 2: Client Success</h3>
                    <p className="text-cyan-100 leading-relaxed">
                      Received <strong>excellent feedback</strong> from clients using our full <strong>Real Estate CRM/ERP software</strong>. Clients like <strong>Abhinandhana Avenues, BRR Group, Sri Jayam Housing, Neems Boro Group</strong> and many others saw <strong>35-60% improvements</strong> in their operations. Their success stories validated our approach.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 3 */}
            <div className="relative mb-12">
              <div className="md:flex items-center justify-between">
                <div className="md:w-5/12 mb-6 md:mb-0 md:text-right md:pr-12">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-cyan-500/30 hover:border-cyan-500 transition-all">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-4 md:float-right md:ml-4">
                      <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Phase 3: The Insight</h3>
                    <p className="text-cyan-100 leading-relaxed">
                      Noticed a <strong>pattern in client demands</strong>: Everyone needed the same core features - multi-project management, payment automation, visual layouts, commission tracking. But each implementation took <strong>weeks of custom development</strong>. There had to be a better way!
                    </p>
                  </div>
                </div>
                <div className="hidden md:block md:w-2/12 flex justify-center">
                  <div className="w-8 h-8 bg-cyan-500 rounded-full border-4 border-purple-900 z-10"></div>
                </div>
                <div className="md:w-5/12"></div>
              </div>
            </div>

            {/* Phase 4 */}
            <div className="relative">
              <div className="md:flex items-center justify-between">
                <div className="md:w-5/12"></div>
                <div className="hidden md:block md:w-2/12 flex justify-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full border-4 border-purple-900 z-10 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="md:w-5/12 mb-6 md:mb-0 md:pl-12">
                  <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-8 border-2 border-cyan-500 shadow-2xl">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mb-4">
                      <Rocket className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Phase 4: MemoraAI is Born!</h3>
                    <p className="text-white leading-relaxed mb-4">
                      Decision made: Build <strong>MemoraAI</strong> - an <strong>advanced SaaS platform</strong> that combines everything we learned from dozens of successful implementations. One system that handles:
                    </p>
                    <ul className="space-y-2 text-white">
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span><strong>All Project Types:</strong> Ventures, Apartments, Farm Lands, Villas</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span><strong>Complex Payments:</strong> EMI, Outrage, Custom payment models</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span><strong>Commission Automation:</strong> Multi-level calculations</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span><strong>Innovative Features:</strong> Based on latest real estate trends</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span><strong>Multi-Language:</strong> Telugu, Hindi, English support</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What Makes Us Different */}
          <div className="mt-16 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/30">
            <h3 className="text-3xl font-bold text-white mb-8 text-center">What Makes MemoraAI Different?</h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500 rounded-full mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Built by Practitioners</h4>
                <p className="text-cyan-100">
                  Not built in a lab. Built after working with dozens of real estate businesses and understanding their actual pain points.
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Proven Success</h4>
                <p className="text-cyan-100">
                  Every feature has been battle-tested with real clients. We know what works because we've seen it work - 35-60% improvements are real numbers.
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Indian Real Estate DNA</h4>
                <p className="text-cyan-100">
                  Built specifically for Indian market. Understands EMI, outrage, commission structures, Telugu/Hindi needs - not an imported solution.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400 mb-2">50+</div>
              <div className="text-cyan-100 text-sm">Layouts Developed</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400 mb-2">30+</div>
              <div className="text-cyan-100 text-sm">Websites Built</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400 mb-2">25+</div>
              <div className="text-cyan-100 text-sm">CRM Implementations</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-cyan-500/30">
              <div className="text-4xl font-bold text-cyan-400 mb-2">5+</div>
              <div className="text-cyan-100 text-sm">Years Experience</div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl p-8">
            <h3 className="text-3xl font-bold text-white mb-4">
              Join the Real Estate Success Story
            </h3>
            <p className="text-xl text-white/90 mb-6">
              Built on proven experience. Ready for your business.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
              >
                Start Your Free Trial
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 bg-purple-700 text-white font-bold rounded-lg hover:bg-purple-800 transition-all border-2 border-white"
              >
                Talk to Founder
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OurStory;
