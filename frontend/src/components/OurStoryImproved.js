import React from 'react';
import { Building, Users, Rocket, Award } from 'lucide-react';

const OurStoryImproved = () => {
  const timeline = [
    {
      phase: "Phase 1: Custom Solutions (2014-2020)",
      icon: <Building className="w-8 h-8" />,
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
      content: "Started with IncomeLands.in - building custom CRM and website solutions for individual real estate developers. Delivered 50+ project websites and 30+ custom CRM systems.",
      stats: ["50+ Layouts", "30+ Websites", "Custom CRMs"]
    },
    {
      phase: "Phase 2: Market Learning (2020-2022)",
      icon: <Users className="w-8 h-8" />,
      color: "green",
      gradient: "from-green-500 to-emerald-600",
      content: "Worked closely with clients to understand pain points: lead leakage, payment tracking chaos, manual commission calculations, and multi-project management challenges.",
      stats: ["Client Feedback", "Pain Points", "Market Research"]
    },
    {
      phase: "Phase 3: MemoraAI Development (2022-2023)",
      icon: <Rocket className="w-8 h-8" />,
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
      content: "Consolidated learnings into a unified SaaS platform. Built multi-tenant architecture, automated payment tracking, visual property layouts, and WhatsApp integration.",
      stats: ["Multi-Tenant", "Automation", "Integration"]
    },
    {
      phase: "Phase 4: Launch & Growth (2024+)",
      icon: <Award className="w-8 h-8" />,
      color: "orange",
      gradient: "from-indigo-500 to-orange-600",
      content: "Launched MemoraAI as a complete real estate automation platform. Helping real estate companies manage multiple projects efficiently with zero lead leakage.",
      stats: ["SaaS Launch", "Live Platform", "Growing"]
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            The MemoraAI Story
          </h2>
          <p className="text-xl md:text-2xl text-gray-600">
            From Custom Solutions to Complete SaaS Platform
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-cyan-600 mx-auto mt-6 rounded-full"></div>
        </div>

        {/* Timeline - Zigzag Layout */}
        <div className="max-w-6xl mx-auto space-y-12">
          {timeline.map((item, index) => {
            const isLeft = index % 2 === 0;
            
            return (
              <div 
                key={index}
                className={`flex items-center ${isLeft ? 'justify-start' : 'justify-end'}`}
              >
                {/* Card Container - 70% width */}
                <div className={`w-full md:w-[70%] ${isLeft ? 'md:pr-[15%]' : 'md:pl-[15%]'}`}>
                  <div className="relative group">
                    {/* Decorative Line */}
                    <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-16 h-1 bg-gradient-to-r ${item.gradient} ${
                      isLeft ? '-right-16' : '-left-16'
                    }`}>
                      <div className={`absolute ${isLeft ? '-right-2' : '-left-2'} top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-4 border-${item.color}-600 rounded-full`}></div>
                    </div>

                    {/* Main Card */}
                    <div className={`bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 border-t-4 border-${item.color}-600 group-hover:scale-105 transform`}>
                      {/* Header */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {item.phase}
                          </h3>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-base text-gray-700 leading-relaxed mb-6">
                        {item.content}
                      </p>

                      {/* Stats Pills */}
                      <div className="flex flex-wrap gap-2">
                        {item.stats.map((stat, idx) => (
                          <span
                            key={idx}
                            className={`px-4 py-2 bg-gradient-to-r ${item.gradient} text-white text-sm font-semibold rounded-full shadow-md`}
                          >
                            {stat}
                          </span>
                        ))}
                      </div>

                      {/* Number Badge */}
                      <div className={`absolute ${isLeft ? '-right-6' : '-left-6'} top-8 w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg border-4 border-white`}>
                        {index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Timeline Line - Hidden on mobile */}
        <div className="hidden md:block absolute left-1/2 top-48 bottom-48 w-1 bg-gradient-to-b from-blue-200 via-purple-200 to-orange-200 -translate-x-1/2 opacity-30"></div>

        {/* Company Background */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl shadow-2xl p-8 md:p-12 border border-blue-100">
            <div className="text-center mb-8">
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Powered by Eloniot Software Solutions
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
                MemoraAI is developed by <span className="font-bold text-blue-600">Eloniot Software Solutions</span>, a company with 10+ years of experience in building custom software for real estate, education, healthcare, and government sectors.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">10+</span>
                </div>
                <p className="text-sm font-semibold text-gray-700">Years Experience</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">50+</span>
                </div>
                <p className="text-sm font-semibold text-gray-700">Projects Delivered</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">30+</span>
                </div>
                <p className="text-sm font-semibold text-gray-700">Websites Built</p>
              </div>
              
              <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl font-bold">25+</span>
                </div>
                <p className="text-sm font-semibold text-gray-700">CRM Systems</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurStoryImproved;
